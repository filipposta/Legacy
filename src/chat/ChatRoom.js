import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useChat } from './ChatContext';
import { db, storage } from '../firebase';
import { doc, updateDoc, getDoc, serverTimestamp, addDoc, collection, deleteDoc, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PaperAirplaneIcon, PhotoIcon, GifIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import GiphyPicker from './GiphyPicker'; // Import the new component
const ChatRoom = () => {
    const { selectedChat, user } = useChat();
    // Add the missing blockedUsers state
    const [blockedUsers, setBlockedUsers] = useState([]);
    // All useState hooks must be unconditional and in the same order each render
    const [message, setMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [selectedGif, setSelectedGif] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editMessageContent, setEditMessageContent] = useState('');
    // Group all useRef hooks
    const messagesEndRef = useRef(null);
    const editInputRef = useRef(null);
    // Define conditional variables (not hooks) based on props/state
    const isOwnMessage = (senderId) => senderId === user?.uid;
    // Always include all useEffect hooks - don't make them conditional
    useEffect(() => {
        // Scroll to bottom on new messages
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedChat?.messages]);
    useEffect(() => {
        // Focus edit input when editing starts
        if (editingMessageId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingMessageId]);
    // Always include all useEffect hooks even if they might do nothing in certain conditions
    useEffect(() => {
        // Check if chat is blocked
        const checkIfBlocked = async () => {
            if (!selectedChat)
                return;
            // ...existing blocking check logic...
        };
        checkIfBlocked();
    }, [selectedChat, user?.uid]);
    // Include any other useEffects - make sure they're ALWAYS declared
    // Load blocked users
    useEffect(() => {
        const loadBlockedUsers = async () => {
            if (!user?.uid)
                return;
            try {
                // Fetch the user's blocked list from Firestore
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setBlockedUsers(userData.blockedUsers || []);
                }
            }
            catch (error) {
                console.error('Error loading blocked users:', error);
            }
        };
        loadBlockedUsers();
    }, [user?.uid]);
    // Update block reason
    useEffect(() => {
        if (isBlocked && !selectedChat?.isGroup && selectedChat?.otherUser) {
            if (blockedUsers.includes(selectedChat.otherUser.uid)) {
                setBlockReason('You have blocked this user');
            }
            else if (user.blockedUsers?.includes(selectedChat.otherUser.uid)) {
                setBlockReason('You have blocked this user');
            }
            else if (selectedChat.otherUser.blockedUsers?.includes(user?.uid)) {
                setBlockReason('This user has blocked you');
            }
            else {
                setBlockReason('Chat is blocked');
            }
        }
        else {
            setBlockReason('');
        }
    }, [isBlocked, selectedChat, user, blockedUsers]);
    // Add new function to handle GIF selection
    const handleGifSelect = (gifUrl) => {
        setSelectedGif(gifUrl);
        setShowGifPicker(false);
    };
    // Start editing a message
    const handleStartEdit = (message) => {
        // Only allow editing your own messages
        if (message.senderId !== user?.uid)
            return;
        setEditingMessageId(message.id);
        setEditMessageContent(message.content);
    };
    // Cancel editing
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditMessageContent('');
    };
    // Save edited message
    const handleSaveEdit = async (messageId) => {
        if (!editMessageContent.trim() || !selectedChat)
            return;
        try {
            let messageRef;
            if (selectedChat.isGroup) {
                messageRef = doc(db, 'groupMessages', selectedChat.id, 'messages', messageId);
            }
            else {
                messageRef = doc(db, 'chats', selectedChat.id, 'messages', messageId);
            }
            await updateDoc(messageRef, {
                content: editMessageContent.trim(),
                edited: true,
                editedAt: new Date()
            });
            // Update the message in the UI
            const updatedMessages = selectedChat.messages.map((msg) => {
                if (msg.id === messageId) {
                    return {
                        ...msg,
                        content: editMessageContent.trim(),
                        edited: true,
                        editedAt: new Date()
                    };
                }
                return msg;
            });
            // Update the selected chat with the new messages
            setSelectedChat({
                ...selectedChat,
                messages: updatedMessages
            });
            setEditingMessageId(null);
            setEditMessageContent('');
        }
        catch (error) {
            console.error('Error updating message:', error);
            alert('Failed to update message');
        }
    };
    // Send message function
    const handleSend = async () => {
        if ((!message.trim() && !imageFile && !selectedGif) || sending || isBlocked)
            return;
        setSending(true);
        try {
            let imageUrl = '';
            // Upload image if present
            if (imageFile) {
                const imageRef = ref(storage, `chatImages/${selectedChat.id}/${Date.now()}_${imageFile.name}`);
                await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(imageRef);
            }
            // If we have a selected GIF, use its URL
            const gifUrl = selectedGif || '';
            // Create the message object with potential GIF
            const newMessage = {
                content: message.trim(),
                senderId: user.uid || user.id,
                imageUrl,
                gifUrl, // Add this field
                timestamp: serverTimestamp(),
                createdAt: serverTimestamp()
            };
            // Add message to subcollection
            await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), newMessage);
            // Update chat with last message info
            const chatRef = doc(db, 'chats', selectedChat.id);
            await updateDoc(chatRef, {
                lastMessage: message.trim() || '[Image]',
                lastMessageTime: serverTimestamp()
            });
            // Reset form
            setMessage('');
            setImageFile(null);
            setSelectedGif(null);
        }
        catch (error) {
            console.error('Error sending message:', error);
            try {
                // Handle BloomFilter error silently
                if (error?.name === 'BloomFilterError') {
                    // Try alternative approach or just continue
                    console.warn('Handled BloomFilter error silently');
                }
                else {
                    alert('Failed to send message. Please try again.');
                }
            }
            catch (e) {
                // Fallback for any error handling errors
            }
        }
        finally {
            setSending(false);
        }
    };
    // Delete or leave chat function
    const handleDeleteChat = async () => {
        if (!selectedChat || !user?.uid)
            return;
        const confirmText = selectedChat.isGroup
            ? `Leave "${selectedChat.groupName || 'this group'}"?`
            : `Delete chat with "${selectedChat.otherUser?.displayName || 'this user'}"?`;
        if (!window.confirm(confirmText))
            return;
        try {
            if (selectedChat.isGroup) {
                // Leave group logic
                const chatRef = doc(db, 'chats', selectedChat.id);
                await updateDoc(chatRef, {
                    participants: arrayRemove(user.uid),
                    members: arrayRemove(user.uid),
                    lastMessage: `${user.displayName || 'User'} left the group`,
                    lastMessageTime: serverTimestamp()
                });
            }
            else {
                // Delete chat logic
                await deleteDoc(doc(db, 'chats', selectedChat.id));
            }
            setSelectedChat(null);
            // Show success notification
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50';
            toast.textContent = selectedChat.isGroup ? 'Left group successfully' : 'Deleted chat successfully';
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 3000);
        }
        catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat. Please try again.');
        }
    };
    // Render placeholder or empty state with X/Twitter style
    if (!selectedChat) {
        return (_jsx("div", { className: "flex flex-1 items-center justify-center text-gray-500 h-full bg-black", children: _jsxs("div", { className: "text-center p-4", children: [_jsx(ChatBubbleLeftRightIcon, { className: "w-10 h-10 mx-auto mb-3 opacity-50" }), _jsx("p", { className: "text-sm", children: "Select a conversation" })] }) }));
    }
    return (_jsxs("div", { className: "flex flex-col h-full bg-black", children: [_jsx("div", { className: "flex items-center justify-between p-3 border-b border-gray-800", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2 text-xs font-bold text-white", children: selectedChat.isGroup
                                ? selectedChat.groupName?.charAt(0) || 'G'
                                : selectedChat.otherUser?.displayName?.charAt(0) || 'U' }), _jsx("h3", { className: "font-medium text-white truncate", children: selectedChat.isGroup
                                ? selectedChat.groupName || 'Group Chat'
                                : selectedChat.otherUser?.displayName || 'Chat' })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-3 bg-black", children: selectedChat.messages?.length === 0 ? (_jsx("div", { className: "text-center text-gray-500 py-8 text-sm", children: _jsx("p", { children: "Send a message to start the conversation" }) })) : (_jsxs("div", { className: "space-y-3", children: [selectedChat.messages?.map((msg) => {
                            const isUserMessage = msg.senderId === (user?.uid || user?.id);
                            const messageClass = isUserMessage
                                ? 'bg-blue-500 text-white self-end'
                                : 'bg-gray-800 text-white self-start';
                            return (_jsx("div", { className: "flex flex-col mb-2", children: _jsx("div", { className: `relative rounded-lg ${isUserMessage ? 'self-end' : 'self-start'}`, children: editingMessageId === msg.id ? (_jsxs("div", { className: "bg-gray-800 p-2 rounded-lg", children: [_jsx("input", { ref: editInputRef, type: "text", value: editMessageContent, onChange: (e) => setEditMessageContent(e.target.value), className: "w-full bg-gray-700 text-white p-2 rounded mb-2", onKeyPress: (e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveEdit(msg.id);
                                                    }
                                                } }), _jsxs("div", { className: "flex justify-end space-x-2", children: [_jsx("button", { onClick: handleCancelEdit, className: "p-1 text-gray-400 hover:text-white", children: _jsx(XMarkIcon, { className: "w-5 h-5" }) }), _jsx("button", { onClick: () => handleSaveEdit(msg.id), className: "p-1 text-green-500 hover:text-green-400", children: _jsx(CheckIcon, { className: "w-5 h-5" }) })] })] })) : (_jsxs("div", { className: `p-3 ${isUserMessage ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`, children: [msg.content && _jsx("p", { className: "text-white", children: msg.content }), msg.imageUrl && (_jsx("img", { src: msg.imageUrl, alt: "Image", className: "mt-2 rounded-md max-w-full" })), msg.gifUrl && (_jsx("img", { src: msg.gifUrl, alt: "GIF", className: "mt-2 rounded-md max-w-full h-auto" })), msg.edited && (_jsx("span", { className: "text-xs text-gray-400 mt-1 inline-block", children: "(edited)" })), isUserMessage && (_jsx("button", { onClick: () => handleStartEdit(msg), className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:bg-black/20 p-1 rounded-full transition-opacity", title: "Edit message", children: _jsx(PencilIcon, { className: "w-3 h-3 text-gray-300" }) }))] })) }) }, msg.id));
                        }), _jsx("div", { ref: messagesEndRef })] })) }), _jsx("div", { className: "p-3 border-t border-gray-800", children: isBlocked ? (_jsx("div", { className: "bg-gray-900 text-red-400 rounded-lg px-4 py-2 text-center text-sm", children: blockReason || 'This conversation is blocked' })) : (_jsxs("div", { className: "flex items-center gap-2 relative", children: [selectedGif && (_jsx("div", { className: "absolute bottom-full mb-2 left-0 bg-gray-800 p-1 rounded-lg border border-gray-700", children: _jsxs("div", { className: "relative", children: [_jsx("img", { src: selectedGif, alt: "Selected GIF", className: "h-20 rounded" }), _jsx("button", { onClick: () => setSelectedGif(null), className: "absolute top-1 right-1 bg-gray-900/80 rounded-full p-0.5", children: _jsx(XMarkIcon, { className: "w-4 h-4 text-white" }) })] }) })), showGifPicker && (_jsx(GiphyPicker, { onSelect: handleGifSelect, onClose: () => setShowGifPicker(false) })), _jsx("input", { type: "text", value: message, onChange: (e) => setMessage(e.target.value), placeholder: `Message ${selectedChat.isGroup ? 'group' : '...'}`, className: "flex-1 p-2.5 bg-gray-900 border border-gray-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm", onKeyPress: (e) => e.key === 'Enter' && !e.shiftKey && handleSend() }), _jsx("button", { onClick: () => setShowGifPicker(!showGifPicker), className: "p-2 text-blue-500 hover:bg-gray-800 rounded-full transition-colors", title: "Add GIF", children: _jsx(GifIcon, { className: "w-5 h-5" }) }), _jsxs("button", { onClick: () => document.getElementById('image-upload')?.click(), className: "p-2 text-blue-500 hover:bg-gray-800 rounded-full transition-colors", title: "Upload image", children: [_jsx(PhotoIcon, { className: "w-5 h-5" }), _jsx("input", { id: "image-upload", type: "file", accept: "image/*", onChange: (e) => setImageFile(e.target.files?.[0] || null), className: "hidden" })] }), _jsx("button", { onClick: handleSend, disabled: (!message.trim() && !imageFile && !selectedGif) || sending, className: "p-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors", children: sending ? (_jsx("div", { className: "w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" })) : (_jsx(PaperAirplaneIcon, { className: "w-5 h-5" })) })] })) })] }));
};
export default ChatRoom;
