import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useChat } from './ChatContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, arrayRemove, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { PlusIcon, UserIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon, TrashIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import GroupCreateModal from './GroupCreateModal';
const ChatList = ({ onClose, isLoading = false }) => {
    // Add setChats to the destructured values from useChat
    const { user, chats, selectedChat, setSelectedChat, setChats } = useChat();
    const [tab, setTab] = useState('chats');
    const [showGroupCreate, setShowGroupCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [friendsInfo, setFriendsInfo] = useState({});
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [showTransferAdminModal, setShowTransferAdminModal] = useState(false);
    const [currentGroupId, setCurrentGroupId] = useState(null);
    const [groupMembers, setGroupMembers] = useState([]);
    // Load friends info with loading state
    useEffect(() => {
        const loadFriendsInfo = async () => {
            if (!user?.friends?.length)
                return;
            setLoadingFriends(true);
            try {
                const info = {};
                await Promise.all(user.friends.map(async (friendId) => {
                    try {
                        const friendDoc = await getDoc(doc(db, 'users', friendId));
                        if (friendDoc.exists()) {
                            const data = friendDoc.data();
                            info[friendId] = {
                                name: data.displayName || data.username || friendId,
                                avatar: data.profilePic || ''
                            };
                        }
                        else {
                            info[friendId] = { name: friendId };
                        }
                    }
                    catch (error) {
                        console.error('Error loading friend:', error);
                        info[friendId] = { name: friendId };
                    }
                }));
                setFriendsInfo(info);
            }
            catch (error) {
                console.error('Error loading friends:', error);
            }
            finally {
                setLoadingFriends(false);
            }
        };
        if (tab === 'friends') {
            loadFriendsInfo();
        }
    }, [user, tab]);
    // Start a chat with a friend
    const handleStartChat = async (friendId) => {
        if (!user)
            return;
        setLoading(true);
        try {
            // Check if chat already exists
            const q = query(collection(db, 'chats'), where('isGroup', '==', false), where('participants', 'array-contains', user.id));
            const snapshot = await getDocs(q);
            let foundChat = null;
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (Array.isArray(data.participants) &&
                    data.participants.includes(friendId) &&
                    data.participants.length === 2) {
                    // Found existing chat
                    const friendInfo = friendsInfo[friendId];
                    const friendSnap = await getDoc(doc(db, 'users', friendId));
                    const friendData = friendSnap.exists() ? friendSnap.data() : {};
                    foundChat = {
                        id: docSnap.id,
                        participants: data.participants,
                        members: data.participants,
                        admins: [],
                        isGroup: false,
                        lastMessage: data.lastMessage || '',
                        lastMessageTime: data.lastMessageTime,
                        messages: [],
                        otherUser: {
                            id: friendId,
                            uid: friendId,
                            username: friendData.username || friendId,
                            displayName: friendData.displayName || friendData.username || friendInfo?.name || friendId,
                            profilePic: friendData.profilePic || friendInfo?.avatar || '',
                            blockedUsers: Array.isArray(friendData.blockedUsers) ? friendData.blockedUsers : []
                        }
                    };
                    break;
                }
            }
            if (foundChat) {
                setSelectedChat(foundChat);
                setTab('chats');
                setLoading(false);
                return;
            }
            // Create new chat
            const docRef = await addDoc(collection(db, 'chats'), {
                isGroup: false,
                participants: [user.id, friendId],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: '',
                lastMessageTime: serverTimestamp()
            });
            // Load friend's data for the new chat
            const friendInfo = friendsInfo[friendId];
            const friendSnap = await getDoc(doc(db, 'users', friendId));
            const friendData = friendSnap.exists() ? friendSnap.data() : {};
            const newChat = {
                id: docRef.id,
                participants: [user.id, friendId],
                members: [user.id, friendId],
                admins: [],
                isGroup: false,
                lastMessage: '',
                lastMessageTime: null,
                messages: [],
                otherUser: {
                    id: friendId,
                    uid: friendId,
                    username: friendData.username || friendId,
                    displayName: friendData.displayName || friendData.username || friendInfo?.name || friendId,
                    profilePic: friendData.profilePic || friendInfo?.avatar || '',
                    blockedUsers: Array.isArray(friendData.blockedUsers) ? friendData.blockedUsers : []
                }
            };
            setSelectedChat(newChat);
            setTab('chats');
        }
        catch (error) {
            console.error('Error starting chat:', error);
            alert('Failed to start chat. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    // Improved handleDeleteChat function
    const handleDeleteChat = async (chat, e) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this entire chat?")) {
            try {
                // Delete the chat document
                await deleteDoc(doc(db, 'chats', chat.id));
                // Update local state to remove the chat
                // setChats(prevChats => prevChats.filter(c => c.id !== chat.id));
                // If this was the selected chat, deselect it
                if (selectedChat?.id === chat.id) {
                    setSelectedChat(null);
                }
                alert("Chat deleted successfully");
            }
            catch (error) {
                console.error("Error deleting chat:", error);
                alert("Failed to delete chat");
            }
        }
    };
    // Improved group leave function with admin handling
    const handleLeaveGroup = async (chat, e) => {
        e.stopPropagation();
        if (!chat.isGroup)
            return;
        if (!window.confirm("Are you sure you want to leave this group?"))
            return;
        try {
            // Get current user ID
            const currentUserId = user?.uid;
            if (!currentUserId) {
                throw new Error("User not authenticated");
            }
            // Debug the chat object to see its structure
            console.log("Leaving group:", chat.id, chat);
            // Create a batch to ensure atomicity
            const batch = writeBatch(db);
            // Try to find the group in multiple possible collections
            const collections = ['groups', 'chats', 'groupChats'];
            let groupRef = null;
            let groupDoc = null;
            let collectionName = '';
            for (const coll of collections) {
                const ref = doc(db, coll, chat.id);
                const snapshot = await getDoc(ref);
                if (snapshot.exists()) {
                    groupRef = ref;
                    groupDoc = snapshot;
                    collectionName = coll;
                    console.log(`Group found in '${coll}' collection`);
                    break;
                }
            }
            if (!groupRef || !groupDoc) {
                throw new Error(`Group with ID ${chat.id} not found in any collection`);
            }
            const groupData = groupDoc.data();
            console.log(`Group data from '${collectionName}':`, groupData);
            // Figure out which field contains members
            const membersField = 'members' in groupData ? 'members' :
                'participants' in groupData ? 'participants' :
                    'members';
            const membersList = groupData[membersField] || [];
            console.log("Current members:", membersList);
            if (!membersList.includes(currentUserId)) {
                throw new Error("You are not a member of this group");
            }
            // Check if user is admin
            const adminField = 'adminId' in groupData ? 'adminId' :
                'creatorId' in groupData ? 'creatorId' :
                    'ownerId' in groupData ? 'ownerId' :
                        'adminId';
            const isAdmin = groupData[adminField] === currentUserId;
            console.log("Is admin:", isAdmin);
            if (isAdmin) {
                const otherMembers = membersList.filter((id) => id !== currentUserId);
                if (otherMembers.length === 0) {
                    // No other members, delete the group
                    await deleteDoc(groupRef);
                    console.log("Group deleted as admin was the last member");
                }
                else {
                    // Transfer ownership to first other member
                    const newAdmin = otherMembers[0];
                    await updateDoc(groupRef, {
                        [membersField]: arrayRemove(currentUserId),
                        [adminField]: newAdmin
                    });
                    console.log("Admin transferred to:", newAdmin);
                }
            }
            else {
                // Regular member leaving
                await updateDoc(groupRef, {
                    [membersField]: arrayRemove(currentUserId)
                });
                console.log("Removed from members list");
            }
            // Update local state
            setChats(prevChats => prevChats.filter(c => c.id !== chat.id));
            if (selectedChat?.id === chat.id) {
                setSelectedChat(null);
            }
            alert("You have successfully left the group");
        }
        catch (error) {
            console.error("Error leaving group:", error);
            alert("Failed to leave group: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };
    // New function to transfer admin and leave
    const handleTransferAdminAndLeave = async (newAdminId) => {
        if (!currentGroupId || !user?.uid)
            return;
        try {
            const groupRef = doc(db, 'groups', currentGroupId);
            // Update admin ID and remove current user
            await updateDoc(groupRef, {
                adminId: newAdminId,
                members: arrayRemove(user.uid)
            });
            // Update local state
            // setChats(prevChats => prevChats.filter(c => c.id !== currentGroupId));
            if (selectedChat?.id === currentGroupId) {
                setSelectedChat(null);
            }
            setShowTransferAdminModal(false);
            alert("Admin role transferred and you left the group");
        }
        catch (error) {
            console.error("Error transferring admin:", error);
            alert("Failed to transfer admin role");
        }
    };
    // Function to delete group directly as admin
    const handleDeleteGroup = async () => {
        if (!currentGroupId)
            return;
        try {
            await deleteDoc(doc(db, 'groups', currentGroupId));
            // setChats(prevChats => prevChats.filter(c => c.id !== currentGroupId));
            if (selectedChat?.id === currentGroupId) {
                setSelectedChat(null);
            }
            setShowTransferAdminModal(false);
            alert("Group deleted successfully");
        }
        catch (error) {
            console.error("Error deleting group:", error);
            alert("Failed to delete group");
        }
    };
    // Delete chat function
    const handleDeleteChatFromList = async (chat, event) => {
        event.stopPropagation();
        const confirmMessage = chat.isGroup
            ? `Are you sure you want to leave "${chat.groupName || 'this group'}"?`
            : `Are you sure you want to delete chat with "${chat.otherUser?.displayName || chat.otherUser?.username || 'this user'}"?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }
        try {
            if (chat.isGroup) {
                const chatRef = doc(db, 'chats', chat.id);
                const chatDoc = await getDoc(chatRef);
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    const updatedParticipants = chatData.participants.filter((id) => id !== user?.id);
                    if (updatedParticipants.length === 0) {
                        await deleteDoc(chatRef);
                        const messagesRef = collection(db, 'chats', chat.id, 'messages');
                        const messagesSnapshot = await getDocs(messagesRef);
                        const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
                        await Promise.all(deletePromises);
                    }
                    else {
                        await updateDoc(chatRef, {
                            participants: updatedParticipants,
                            members: updatedParticipants,
                            lastMessage: `${user?.displayName || user?.username || 'User'} left the group`,
                            lastMessageTime: serverTimestamp()
                        });
                    }
                }
            }
            else {
                const chatRef = doc(db, 'chats', chat.id);
                await deleteDoc(chatRef);
            }
            if (selectedChat?.id === chat.id) {
                setSelectedChat(null);
            }
            const notification = document.createElement('div');
            notification.className = 'fixed top-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]';
            notification.textContent = chat.isGroup ? '👋 Left group' : '🗑️ Chat deleted';
            document.body.appendChild(notification);
            setTimeout(() => {
                if (notification.parentNode)
                    notification.parentNode.removeChild(notification);
            }, 2000);
        }
        catch (error) {
            console.error('Error deleting chat:', error);
            alert('❌ Failed to delete chat. Please try again.');
        }
    };
    // Filter chats based on search
    const filteredChats = chats.filter(chat => {
        if (!searchTerm)
            return true;
        const searchLower = searchTerm.toLowerCase();
        if (chat.isGroup) {
            return chat.groupName?.toLowerCase().includes(searchLower);
        }
        else {
            return (chat.otherUser?.displayName?.toLowerCase().includes(searchLower) ||
                chat.otherUser?.username?.toLowerCase().includes(searchLower));
        }
    });
    // Filter friends based on search
    const filteredFriends = user?.friends?.filter(friendId => {
        if (!searchTerm)
            return true;
        const info = friendsInfo[friendId];
        return info?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];
    // Render friends list with loading states
    const renderFriendsList = () => {
        if (loadingFriends) {
            return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full py-8", children: [_jsx("div", { className: "w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" }), _jsx("p", { className: "text-slate-400 text-sm", children: "Loading friends..." })] }));
        }
        if (filteredFriends.length === 0) {
            return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-slate-400 px-4", children: [_jsx(UserIcon, { className: "w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 opacity-50" }), _jsx("p", { className: "text-center text-xs sm:text-sm", children: searchTerm ? 'No friends found' : 'No friends yet. Add some friends!' })] }));
        }
        return (filteredFriends.map((friendId) => {
            const info = friendsInfo[friendId];
            const isBlockedByCurrentUser = user?.blockedUsers?.includes(friendId);
            return (_jsx("div", { onClick: () => !isBlockedByCurrentUser && !loading && handleStartChat(friendId), className: `p-2 sm:p-3 rounded-lg transition-all border ${isBlockedByCurrentUser
                    ? 'bg-red-900/20 border-red-500/30 cursor-not-allowed opacity-50'
                    : loading
                        ? 'bg-slate-800/50 border-slate-700/50 cursor-wait'
                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 cursor-pointer'}`, children: _jsxs("div", { className: "flex items-center space-x-2 sm:space-x-3", children: [_jsxs("div", { className: "flex-shrink-0 relative", children: [info?.avatar ? (_jsx("img", { src: info.avatar, alt: "Friend", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" })) : (_jsx("div", { className: "w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-white font-semibold text-xs", children: (info?.name || friendId).charAt(0).toUpperCase() }) })), (loading || isLoading) && handleStartChat && info && (_jsx("div", { className: "absolute inset-0 bg-black/40 rounded-full flex items-center justify-center", children: _jsx("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }) }))] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-medium text-slate-100 truncate text-sm sm:text-base", children: info?.name || friendId }), _jsx("p", { className: "text-xs sm:text-sm text-slate-400", children: isBlockedByCurrentUser ? 'Blocked' : (loading || isLoading) ? 'Loading...' : 'Tap to chat' })] })] }) }, friendId));
        }));
    };
    // Add this function inside ChatList component
    const handleGroupCreated = (newGroup) => {
        setChats(prevChats => [newGroup, ...prevChats]);
        setTab('chats');
        setShowGroupCreate(false);
        setSelectedChat(newGroup);
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-black", children: [_jsxs("div", { className: "p-3 border-b border-gray-800 flex-shrink-0", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold text-white", children: "Messages" }), _jsx("div", { className: "flex space-x-2", children: _jsx("button", { onClick: () => setShowGroupCreate(true), className: "p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors", title: "Create Group", children: _jsx(PlusIcon, { className: "w-4 h-4" }) }) })] }), _jsxs("div", { className: "mt-3 relative", children: [_jsx(MagnifyingGlassIcon, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" }), _jsx("input", { type: "text", placeholder: "Search messages", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-9 pr-3 py-2 bg-gray-900 border-none rounded-full text-white placeholder-gray-500 focus:outline-none text-sm" })] }), _jsxs("div", { className: "flex mt-3 border-b border-gray-800", children: [_jsx("button", { onClick: () => setTab('chats'), className: `flex-1 pb-3 text-sm font-medium ${tab === 'chats'
                                    ? 'text-white border-b-2 border-blue-500'
                                    : 'text-gray-500 hover:text-gray-300'}`, children: "Chats" }), _jsx("button", { onClick: () => setTab('friends'), className: `flex-1 pb-3 text-sm font-medium ${tab === 'friends'
                                    ? 'text-white border-b-2 border-blue-500'
                                    : 'text-gray-500 hover:text-gray-300'}`, children: "Friends" })] })] }), _jsxs("div", { className: "flex-1 overflow-auto", children: [tab === 'chats' && (_jsx("div", { className: "py-2 px-3 space-y-1", children: filteredChats.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-40 text-gray-500 px-4", children: [_jsx(ChatBubbleLeftRightIcon, { className: "w-8 h-8 mb-2 opacity-50" }), _jsx("p", { className: "text-center text-sm", children: searchTerm ? 'No chats found' : 'No chats yet' })] })) : (filteredChats.map((chat) => (_jsxs("div", { className: "relative group p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-900/50", onClick: () => setSelectedChat(chat), children: [_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-20 h-20 rounded-full bg-gray-800 flex-shrink-0 mr-3 flex items-center justify-center", children: (chat.isGroup && chat.groupPhoto) ? (_jsx("img", { src: chat.groupPhoto, alt: "Group", className: "w-full h-full rounded-full object-cover" })) : chat.isGroup ? (_jsx("span", { className: "text-white font-bold text-3xl", children: (chat.groupName || 'G').charAt(0).toUpperCase() })) : chat.otherUser?.profilePic ? (_jsx("img", { src: chat.otherUser.profilePic, alt: "User", className: "w-full h-full rounded-full object-cover" })) : (_jsx("span", { className: "text-white font-bold text-3xl", children: (chat.otherUser?.displayName || chat.otherUser?.username || 'U').charAt(0).toUpperCase() })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("h3", { className: "font-medium text-white truncate", children: chat.isGroup ?
                                                                (chat.groupName || 'Group Chat') :
                                                                (chat.otherUser?.displayName || chat.otherUser?.username || 'Unknown User') }), chat.lastMessageTime && (_jsx("span", { className: "text-xs text-gray-500", children: new Date(chat.lastMessageTime.toDate?.() || chat.lastMessageTime).toLocaleDateString([], {
                                                                month: 'short',
                                                                day: 'numeric'
                                                            }) }))] }), _jsx("p", { className: "text-sm text-gray-400 truncate", children: chat.lastMessage || 'No messages yet' })] })] }), _jsxs("div", { className: "absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1", children: [chat.isGroup && (_jsx("button", { onClick: (e) => handleLeaveGroup(chat, e), className: "p-1.5 bg-yellow-500/80 hover:bg-yellow-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100", title: chat.adminId === user?.uid ? "Leave/Transfer Group" : "Leave Group", children: _jsx(ArrowRightOnRectangleIcon, { className: "h-3.5 w-3.5" }) })), _jsx("button", { onClick: (e) => handleDeleteChat(chat, e), className: "p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity", title: "Delete Chat", children: _jsx(TrashIcon, { className: "h-3.5 w-3.5" }) })] })] }, chat.id)))) })), tab === 'friends' && (_jsx("div", { className: "h-full overflow-y-auto p-1.5 sm:p-2 lg:p-3 space-y-1.5 sm:space-y-2", children: renderFriendsList() }))] }), _jsx(GroupCreateModal, { isOpen: showGroupCreate, onClose: () => setShowGroupCreate(false), onGroupCreated: handleGroupCreated }), showTransferAdminModal && (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4", children: _jsxs("div", { className: "bg-gray-900 rounded-xl p-5 max-w-md w-full", children: [_jsx("h3", { className: "text-lg font-bold text-white mb-4", children: "Transfer Admin Rights" }), _jsx("p", { className: "text-gray-300 mb-4", children: "You're the group admin. Choose a new admin or delete the group:" }), _jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto mb-4", children: groupMembers.map(member => (_jsxs("button", { onClick: () => handleTransferAdminAndLeave(member.id), className: "w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-blue-800 text-white transition-colors", children: ["Make ", member.name, " the new admin"] }, member.id))) }), _jsxs("div", { className: "flex justify-end space-x-3", children: [_jsx("button", { onClick: () => setShowTransferAdminModal(false), className: "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md", children: "Cancel" }), _jsx("button", { onClick: handleDeleteGroup, className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md", children: "Delete Group" })] })] }) }))] }));
};
export default ChatList;
