import React, { useState, useEffect } from 'react'
import { ChatProvider } from './ChatContext'
import ChatList from './ChatList'
import ChatRoom from './ChatRoom'
import GroupInfoModal from './GroupInfoModal'
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/solid'
import { useChat } from './ChatContext'
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'

// X-style chat header with improved appearance
const ChatHeader: React.FC<{ onClose: () => void, selectedChat: any, setShowGroupInfo: (show: boolean) => void }> = 
  ({ onClose, selectedChat, setShowGroupInfo }) => (
  <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-black flex-shrink-0 shadow-lg">
    <h2 className="text-lg font-bold text-white flex items-center">
      {selectedChat?.isGroup ? 
        <span className="flex items-center">
          <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2 text-xs font-bold">
            {selectedChat.groupName?.charAt(0) || 'G'}
          </span>
          {selectedChat.groupName}
        </span> : 
        <span className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-12 h-12 mr-2 object-cover"
          />
          Chat
        </span>
      }
    </h2>
    <div className="flex items-center space-x-2">
      {selectedChat?.isGroup && (
        <button
          onClick={() => setShowGroupInfo(true)}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
          title="Group Info"
        >
          <InformationCircleIcon className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
        aria-label="Close"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  </div>
)

// Add a LeaveGroupHandler component to provide better debugging and handling
const LeaveGroupHandler = () => {
  const { selectedChat, setSelectedChat, user, chats, setChats } = useChat();
  const [leaveError, setLeaveError] = useState<string | null>(null);
  
  // Function to handle leaving groups with better error reporting
  const handleLeaveGroup = async () => {
    if (!selectedChat?.isGroup || !user?.uid) return;
    
    try {
      setLeaveError(null);
      console.log("Attempting to leave group:", selectedChat.id);
      
      // Debug the structure of the selected chat
      console.log("Group structure:", JSON.stringify(selectedChat, null, 2));
      
      // First, verify which collection the group is in
      let groupRef, groupDoc;
      
      // Try groups collection first
      groupRef = doc(db, 'groups', selectedChat.id);
      groupDoc = await getDoc(groupRef);
      
      // If not found, try chats collection
      if (!groupDoc.exists()) {
        console.log("Group not found in 'groups' collection, trying 'chats'");
        groupRef = doc(db, 'chats', selectedChat.id);
        groupDoc = await getDoc(groupRef);
      }
      
      // If still not found, try groupChats collection
      if (!groupDoc.exists()) {
        console.log("Group not found in 'chats' collection, trying 'groupChats'");
        groupRef = doc(db, 'groupChats', selectedChat.id);
        groupDoc = await getDoc(groupRef);
      }
      
      if (!groupDoc.exists()) {
        throw new Error("Group document not found in any collection");
      }
      
      console.log("Found group document:", groupDoc.data());
      
      // Determine the field name for members (it might be different depending on your schema)
      const groupData = groupDoc.data();
      const membersField = 
        groupData.members ? 'members' : 
        groupData.participants ? 'participants' : 
        'members';
      
      // Remove user from group
      await updateDoc(groupRef, {
        [membersField]: arrayRemove(user.uid)
      });
      
      // Update local state
      setChats(prevChats => prevChats.filter(c => c.id !== selectedChat.id));
      setSelectedChat(null);
      alert("You have left the group successfully");
      
    } catch (error) {
      console.error("Error leaving group:", error);
      setLeaveError(error instanceof Error ? error.message : "Unknown error");
      alert("Failed to leave group: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };
  
  // If there's an error, show a debug panel
  return (
    <>
      {leaveError && selectedChat?.isGroup && (
        <div className="bg-red-900/50 p-3 border-t border-red-700 text-sm">
          <p className="text-red-300 mb-2">Error leaving group: {leaveError}</p>
          <button 
            onClick={handleLeaveGroup}
            className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs"
          >
            Try Again
          </button>
        </div>
      )}
    </>
  );
};

const ChatContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { selectedChat, setSelectedChat } = useChat() // Get setSelectedChat from Context
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [device, setDevice] = useState<'mobile' | 'desktop'>(
    window.innerWidth < 768 ? 'mobile' : 'desktop'
  )

  // Handle cross-platform layout
  useEffect(() => {
    const handleResize = () => {
      setDevice(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // X-style container - black background similar to X/Twitter
  const containerClass = 'fixed z-[100] inset-0 bg-black text-white flex flex-col overflow-hidden'

  // X-style responsive layout classes
  const chatListClass = device === 'mobile'
    ? selectedChat 
      ? 'hidden' // Hide chat list when a chat is selected on mobile
      : 'w-full h-full' 
    : 'w-[320px] h-full border-r border-gray-800 overflow-hidden flex-shrink-0'

  const chatRoomClass = device === 'mobile'
    ? selectedChat
      ? 'flex-1 w-full h-full' 
      : 'hidden'
    : 'flex-1 overflow-hidden'

  // Add X-style mobile back button
  const MobileHeader = () => (
    device === 'mobile' && selectedChat ? (
      <div className="bg-black p-3 border-b border-gray-800 flex items-center">
        <button 
          onClick={() => setSelectedChat(null)}
          className="text-blue-400 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back
        </button>
      </div>
    ) : null
  )

  // Remove the extra global styles for mobile buttons since we now have a better solution
  useEffect(() => {
    const handleResize = () => {
      setDevice(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div className={containerClass}>
        {/* Fix condition - was using incorrect operator */}
        {(device !== 'mobile' || !selectedChat) && (
          <ChatHeader 
            onClose={onClose} 
            selectedChat={selectedChat}
            setShowGroupInfo={setShowGroupInfo}
          />
        )}

        {/* Mobile back button */}
        <MobileHeader />

        {/* Content layout */}
        <div className="flex h-full overflow-hidden">
          {/* Chat list */}
          <div className={chatListClass}>
            <ChatList onClose={onClose} />
          </div>
          {/* Chat room */}
          <div className={chatRoomClass}>
            <ChatRoom />
            {/* Add the LeaveGroupHandler component */}
            <LeaveGroupHandler />
          </div>
        </div>
      </div>
      <GroupInfoModal 
        isOpen={showGroupInfo} 
        onClose={() => setShowGroupInfo(false)} 
      />
    </>
  )
}

const MiniChat: React.FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <ChatProvider>
      {/* X-style floating button */}
      {!open && (
        <button
          className="fixed z-50 bottom-6 right-6 bg-blue-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all"
          onClick={() => setOpen(true)}
          aria-label="Open Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {open && <ChatContent onClose={() => setOpen(false)} />}
    </ChatProvider>
  )
}

export default MiniChat