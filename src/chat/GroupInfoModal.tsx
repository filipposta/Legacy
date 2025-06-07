import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { useChat } from './ChatContext'
import { db, storage } from '../firebase'
import {
  doc,
  updateDoc,
  arrayRemove,
  getDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { PencilIcon } from '@heroicons/react/24/outline'

interface GroupInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ isOpen, onClose }) => {
  const { selectedChat, user } = useChat()
  const [groupName, setGroupName] = useState('')
  const [groupImage, setGroupImage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [membersInfo, setMembersInfo] = useState<{[key: string]: any}>({})

  // Load group info when modal opens
  useEffect(() => {
    if (isOpen && selectedChat?.isGroup) {
      setGroupName(selectedChat.groupName || '')
      setGroupImage(selectedChat.groupImage || '')
      loadMembersInfo()
    }
  }, [isOpen, selectedChat])

  // Move early return AFTER all hooks are declared
  if (!selectedChat || !selectedChat.isGroup) {
    return null
  }

  const loadMembersInfo = async () => {
    if (!selectedChat?.members) return

    try {
      const membersData: {[key: string]: any} = {}
      
      for (const memberId of selectedChat.members) {
        try {
          const memberDoc = await getDoc(doc(db, 'users', memberId))
          if (memberDoc.exists()) {
            const data = memberDoc.data()
            membersData[memberId] = {
              name: data.displayName || data.username || memberId,
              avatar: data.profilePic || '',
              username: data.username || '',
              displayName: data.displayName || ''
            }
          } else {
            membersData[memberId] = { 
              name: memberId, 
              avatar: '',
              username: memberId,
              displayName: memberId
            }
          }
        } catch (error) {
          console.error(`Error loading member ${memberId}:`, error)
          membersData[memberId] = { 
            name: memberId, 
            avatar: '',
            username: memberId,
            displayName: memberId
          }
        }
      }
      
      setMembersInfo(membersData)
    } catch (error) {
      console.error('Error loading members info:', error)
    }
  }

  const handleUpdateGroup = async () => {
    if (!selectedChat?.id || !groupName.trim() || uploading) return

    setUploading(true)
    try {
      const updateData: any = {
        groupName: groupName.trim(),
        lastUpdated: new Date()
      }

      if (groupImage !== selectedChat.groupImage) {
        updateData.groupImage = groupImage
      }

      const chatRef = doc(db, 'chats', selectedChat.id)
      await updateDoc(chatRef, updateData)

      setIsEditing(false)
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-6 right-6 bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]'
      notification.textContent = '✅ Group updated successfully'
      document.body.appendChild(notification)
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification)
      }, 3000)
    } catch (error) {
      console.error('Error updating group:', error)
      alert('❌ Failed to update group')
    } finally {
      setUploading(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!selectedChat?.id || !user?.uid) return

    if (!window.confirm('Are you sure you want to leave this group?')) return

    try {
      const chatRef = doc(db, 'chats', selectedChat.id)
      await updateDoc(chatRef, {
        members: arrayRemove(user.uid),
        lastUpdated: new Date()
      })

      onClose()
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-6 right-6 bg-orange-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]'
      notification.textContent = '👋 Left group successfully'
      document.body.appendChild(notification)
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification)
      }, 3000)
    } catch (error) {
      console.error('Error leaving group:', error)
      alert('❌ Failed to leave group')
    }
  }

  const handleImageUpload = async (file: File) => {
    if (!selectedChat?.id || !file) return

    setUploading(true)
    try {
      const imageRef = ref(storage, `groupImages/${selectedChat.id}/${Date.now()}_${file.name}`)
      await uploadBytes(imageRef, file)
      const downloadURL = await getDownloadURL(imageRef)
      setGroupImage(downloadURL)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('❌ Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const isAdmin = selectedChat.admins?.includes(user?.uid || '') || false
  const memberCount = selectedChat.members?.length || 0

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[110]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <Dialog.Panel className="w-full max-w-[90vw] sm:max-w-md bg-slate-900 p-4 sm:p-6 rounded-xl text-slate-100 shadow-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-bold mb-5 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Group Info
          </Dialog.Title>

          {/* Group Image */}
          <div className="text-center mb-4">
            <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {groupImage ? (
                <img src={groupImage} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-slate-400">
                  {groupName.charAt(0).toUpperCase() || 'G'}
                </span>
              )}
            </div>
            
            {isAdmin && isEditing && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                  className="hidden"
                  id="group-image-upload"
                />
                <label
                  htmlFor="group-image-upload"
                  className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer transition-colors"
                >
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Change Photo
                </label>
              </div>
            )}
          </div>

          {/* Group Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-300">Group Name</label>
            {isEditing && isAdmin ? (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              />
            ) : (
              <p className="text-lg font-semibold text-slate-100">{groupName}</p>
            )}
          </div>

          {/* Group features info */}
          <div className="mb-4 p-3 bg-slate-800/30 rounded-lg">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Chat Features</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">GIF Search</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  import.meta.env.VITE_GIPHY_API_KEY 
                    ? 'bg-green-600/20 text-green-400' 
                    : 'bg-orange-600/20 text-orange-400'
                }`}>
                  {import.meta.env.VITE_GIPHY_API_KEY ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Image Sharing</span>
                <span className="px-2 py-1 rounded text-xs bg-green-600/20 text-green-400">
                  Enabled
                </span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 text-slate-300">
              Members ({memberCount})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedChat.members?.map((memberId) => {
                const memberInfo = membersInfo[memberId]
                const isCurrentAdmin = selectedChat.admins?.includes(memberId)
                const isCurrentUser = memberId === user?.uid
                
                return (
                  <div key={memberId} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                        {memberInfo?.avatar ? (
                          <img 
                            src={memberInfo.avatar} 
                            alt={memberInfo.name} 
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-300">
                            {(memberInfo?.displayName || memberInfo?.username || memberInfo?.name || memberId).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {memberInfo?.displayName || memberInfo?.username || memberInfo?.name || 'Unknown User'}
                          {isCurrentUser && ' (You)'}
                        </p>
                        {memberInfo?.username && memberInfo?.displayName && (
                          <p className="text-xs text-slate-400">@{memberInfo.username}</p>
                        )}
                        {isCurrentAdmin && (
                          <p className="text-xs text-purple-400">Admin</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isEditing && isAdmin ? (
              <button
                onClick={handleUpdateGroup}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {uploading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4zm16 0a8 8 0 01-8 8v-8h8z" />
                  </svg>
                )}
                Save Changes
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                Edit Group
              </button>
            )}

            <button
              onClick={handleLeaveGroup}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m6 0l-3-3m3 3l-3 3" />
              </svg>
              Leave Group
            </button>
          </div>

          {/* Close Button */}
          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default GroupInfoModal
