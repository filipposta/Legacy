import React, { useState, useRef } from 'react';
import { Dialog } from '@headlessui/react'
import { db, storage } from '../firebase'
import { 
  collection, addDoc, serverTimestamp, 
  DocumentReference, Timestamp, getDoc, doc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useChat } from './ChatContext'
import { UserIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline'

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void; // <-- add this if not present
}

const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const { user } = useChat()
  const [groupName, setGroupName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [friendsInfo, setFriendsInfo] = useState<Record<string, { name: string; avatar?: string }>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load friends info for selection
  React.useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.friends?.length) return
      const info: Record<string, { name: string; avatar?: string }> = {}
      await Promise.all(
        user.friends.map(async (fid) => {
          try {
            const snap = await getDoc(doc(db, 'users', fid))
            if (snap.exists()) {
              const data = snap.data()
              info[fid] = {
                name: data.displayName || data.username || fid,
                avatar: data.profilePic || '',
              }
            } else {
              info[fid] = { name: fid }
            }
          } catch (error) {
            console.error('Error loading friend:', error)
            info[fid] = { name: fid }
          }
        })
      )
      setFriendsInfo(info)
    }
    if (isOpen) fetchFriends()
  }, [user, isOpen])

  const handleToggleFriend = (fid: string) => {
    setSelectedFriends((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    )
  }

  // Create group with admin role
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate inputs
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    
    if (selectedFriends.length === 0) {
      setError("Please select at least one user");
      return;
    }
    
    if (isCreating) return;
    
    setIsCreating(true);
    
    try {
      // Process group photo if provided
      let groupPhotoUrl = '';
      
      if (imageFile) {
        try {
          const storageRef = ref(storage, `group_photos/${Date.now()}_${imageFile.name}`)
          await uploadBytes(storageRef, imageFile)
          groupPhotoUrl = await getDownloadURL(storageRef)
        } catch (uploadError) {
          console.error('Error uploading group photo:', uploadError);
          // Continue without the photo if upload fails
        }
      }
      
      // Ensure current user is included as a member
      const allMembers = [...selectedFriends];
      if (!allMembers.includes(user?.id)) {
        allMembers.push(user?.id);
      }

      // Create properly structured group data
      const groupData = {
        groupName: groupName.trim(),
        members: allMembers,
        adminId: user?.id,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        groupPhoto: groupPhotoUrl || null,
        lastMessage: '',
        lastMessageTime: serverTimestamp()
      };
      
      // Create group document with explicit typing
      const groupRef = await addDoc(collection(db, 'groups'), groupData);
      
      // Create initial system message to establish the chat
      await addDoc(collection(db, 'groupMessages', groupRef.id, 'messages'), {
        content: `Group "${groupName.trim()}" created by ${user?.displayName || 'User'}`,
        senderId: 'system',
        senderName: 'System',
        timestamp: serverTimestamp(),
        systemMessage: true
      });
      
      // Reset form
      setGroupName('')
      setImageFile(null)
      setSelectedFriends([])
      
      // Generate invite link
      const link = `${window.location.origin}/invite/${groupRef.id}`;
      setInviteLink(link);
      
      // Notify parent component
      if (onGroupCreated) {
        // Optionally fetch the created group data
        const groupDoc = await getDoc(groupRef);
        const groupData = groupDoc.exists() ? groupDoc.data() : {};

        onGroupCreated({
          id: groupRef.id,
          isGroup: true,
          groupName: groupData.groupName || groupName,
          groupPhoto: groupData.groupPhoto || groupPhotoUrl || '',
          members: groupData.members || allMembers,
          admins: groupData.admins || [user?.id],
          lastMessage: groupData.lastMessage || '',
          lastMessageTime: groupData.lastMessageTime || null,
        });
      }

      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]'
      notification.textContent = '✅ Group created successfully!'
      document.body.appendChild(notification)
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification)
      }, 3000)
    } catch (err) {
      console.error('Error creating group:', err)
      setError(err instanceof Error ? err.message : "Failed to create group. Please try again.");
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleClose = () => {
    setGroupName('')
    setImageFile(null)
    setSelectedFriends([])
    setInviteLink(null)
    onClose()
  }

  // Add this handler for image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Set the file for upload
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add this to clear the image
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-[110]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="w-full max-w-[90vw] sm:max-w-sm md:max-w-md bg-slate-900 p-3 sm:p-6 rounded-xl text-slate-100 shadow-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Create Group Chat
          </Dialog.Title>

          {/* Show any errors */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group Name"
            className="w-full p-2.5 sm:p-3 mb-3 sm:mb-4 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition text-sm sm:text-base"
          />

          {/* Image upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-300">Group Photo (Optional)</label>
            
            <div className="flex items-center space-x-4">
              {/* Image Preview */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed 
                ${imagePreview ? 'border-blue-500' : 'border-gray-600'}`}>
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    className="w-full h-full object-cover rounded-full" 
                    alt="Group photo preview"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="groupPhotoInput"
                />
                
                {/* Beautiful File Selection Button */}
                <label 
                  htmlFor="groupPhotoInput"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                  </svg>
                  Choose Photo
                </label>
                
                {/* Clear button, only shown if image selected */}
                {imagePreview && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="ml-2 text-sm text-red-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Friends selection */}
          {user?.friends?.length ? (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Add Friends ({selectedFriends.length} selected)
              </label>
              <div className="max-h-32 overflow-y-auto bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                {user.friends.map((fid) => {
                  const info = friendsInfo[fid]
                  const isSelected = selectedFriends.includes(fid)
                  
                  return (
                    <div
                      key={fid}
                      onClick={() => handleToggleFriend(fid)}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-600/30' : 'hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center mr-3">
                        {info?.avatar ? (
                          <img src={info.avatar} alt={info.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="flex-1 text-sm">{info?.name || fid}</span>
                      {isSelected && <CheckIcon className="w-5 h-5 text-purple-400" />}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg text-center">
              <p className="text-sm text-slate-400">No friends to add. Add friends first to create group chats.</p>
            </div>
          )}

          {/* Invite link display */}
          {inviteLink && (
            <div className="mt-6 p-5 bg-slate-800 rounded-xl text-white text-center">
              <div className="mb-3 text-2xl font-bold">Group Created!</div>
              <div className="mb-2 text-lg">Share this invite link:</div>
              <input
                className="w-full mt-2 p-3 rounded bg-slate-900 text-white text-lg text-center font-mono"
                value={inviteLink}
                readOnly
                onFocus={e => e.target.select()}
              />
              <button
                className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-lg font-semibold"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                }}
              >
                Copy Link
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 transition-colors text-sm"
            >
              {inviteLink ? 'Close' : 'Cancel'}
            </button>
            {!inviteLink && (
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || isCreating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm flex items-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Group</span>
                )}
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default GroupCreateModal
