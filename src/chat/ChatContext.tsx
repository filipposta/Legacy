import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth, db, storage } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  orderBy,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
// import blockSound from '../assets/block.mp3'
// import unblockSound from '../assets/unblock.mp3'
// import editSound from '../assets/edit.mp3'

// Interfaces
export interface UserData {
  id: string
  uid: string // Add uid for compatibility
  username: string
  displayName: string
  profilePic?: string
  friends?: string[]
  blockedUsers?: string[]
}

export interface ChatData {
  id: string
  participants: string[]
  members?: string[] // Add members for compatibility
  admins?: string[] // Add admins for compatibility
  isGroup: boolean
  groupName?: string
  groupPhoto?: string
  groupImage?: string // Add groupImage for compatibility
  groupAdmin?: string[]
  lastMessage?: string
  lastMessageTime?: any
  otherUser?: UserData
  messages?: MessageData[] // Add messages array
}

export interface MessageData {
  id: string
  chatId?: string
  senderId: string
  content: string
  text?: string
  timestamp: any
  isDeleted?: boolean
  isEdited?: boolean
  editedAt?: any
  deletedAt?: any
  deletedBy?: string
  imageUrl?: string
  audioUrl?: string
  recordingDuration?: number
  isVoiceMessage?: boolean
  gifUrl?: string
}

type Message = MessageData;

interface GroupData {
  id: string;
  groupName: string;
  members: string[];
  adminId: string;
  createdAt: any; // Timestamp
  groupPhoto?: string;
  lastMessage?: string;
  lastMessageTime?: any; // Timestamp
}

// Add this type to your context if not already defined
export interface GroupChat {
  id: string;
  isGroup: true;
  groupName: string;
  groupPhoto?: string;
  members: string[];
  adminId: string;
  lastMessage?: string;
  lastMessageTime?: any;
  messages: Message[];
}

// Context Type
interface ChatContextType {
  user: UserData | null
  currentUser: UserData | null
  chats: ChatData[]
  selectedChat: ChatData | null
  messages: MessageData[]
  setSelectedChat: (chat: ChatData | null) => void
  blockUser: (uid: string) => Promise<void>
  unblockUser: (uid: string) => Promise<void>
  updateGroupName: (chatId: string, name: string) => Promise<void>
  updateGroupPhoto: (chatId: string, file: File) => Promise<string | undefined>
  setChats: React.Dispatch<React.SetStateAction<(DirectChat | GroupChat)[]>>
}

// Context
const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used inside ChatProvider')
  return context
}

// Utility: play sound (uncomment and provide mp3 files to enable)
const playSound = (/*sound: string*/) => {
  // try { new Audio(sound).play() } catch {}
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null)
  const [chats, setChats] = useState<(DirectChat | GroupChat)[]>([])
  const [selectedChat, setSelectedChat] = useState<DirectChat | GroupChat | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])

  // 1. Load logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const docRef = doc(db, 'users', firebaseUser.uid)
          const userSnap = await getDoc(docRef)
          if (userSnap.exists()) {
            const data = userSnap.data()
            const userData = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid, // Add uid for compatibility
              username: data.username || '',
              displayName: data.displayName || data.username || '',
              profilePic: data.profilePic || '',
              friends: Array.isArray(data.friends) ? data.friends : [],
              blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers : []
            }
            setUser(userData)
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error loading user:', err)
        setUser(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // 2. Load chats for user - Fix the data loading
  useEffect(() => {
    if (!user) {
      setChats([])
      return
    }

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.id))
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const chatList: ChatData[] = []

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          const isGroup = data.isGroup || false

          const chat: ChatData = {
            id: docSnap.id,
            participants: Array.isArray(data.participants) ? data.participants : [],
            members: Array.isArray(data.participants) ? data.participants : [], // Use participants as members
            admins: Array.isArray(data.admins) ? data.admins : (Array.isArray(data.groupAdmin) ? data.groupAdmin : []),
            isGroup,
            groupName: data.groupName,
            groupPhoto: data.groupPhoto,
            groupImage: data.groupPhoto,
            groupAdmin: Array.isArray(data.groupAdmin) ? data.groupAdmin : [],
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime,
            messages: [] // Initialize empty, will be populated by message listener
          }

          if (!isGroup) {
            const otherId = chat.participants.find((id: string) => id !== user.id)
            if (otherId) {
              try {
                const otherSnap = await getDoc(doc(db, 'users', otherId))
                if (otherSnap.exists()) {
                  const otherData = otherSnap.data()
                  chat.otherUser = {
                    id: otherId,
                    uid: otherId,
                    username: otherData.username || '',
                    displayName: otherData.displayName || otherData.username || '',
                    profilePic: otherData.profilePic || '',
                    blockedUsers: Array.isArray(otherData.blockedUsers) ? otherData.blockedUsers : []
                  }
                } else {
                  // Fallback for users that don't exist in database
                  chat.otherUser = {
                    id: otherId,
                    uid: otherId,
                    username: otherId,
                    displayName: otherId,
                    profilePic: '',
                    blockedUsers: []
                  }
                }
              } catch (error) {
                console.error('Error loading other user:', error)
                // Fallback for network errors
                chat.otherUser = {
                  id: otherId,
                  uid: otherId,
                  username: otherId,
                  displayName: otherId,
                  profilePic: '',
                  blockedUsers: []
                }
              }
            }
          }

          chatList.push(chat)
        }

        // Sort chats by time
        chatList.sort((a, b) => {
          const aTime = a.lastMessageTime?.toDate?.() || new Date(0)
          const bTime = b.lastMessageTime?.toDate?.() || new Date(0)
          return bTime.getTime() - aTime.getTime()
        })

        console.log('Loaded chats:', chatList) // Debug logging
        setChats(chatList)
      } catch (err) {
        console.error('Error loading chats:', err)
        setChats([])
      }
    })

    return () => unsubscribe()
  }, [user])

  // 3. Load messages when a chat is selected - update selected chat with messages
  useEffect(() => {
    if (!selectedChat) {
      setMessages([])
      return
    }

    const q = query(
      collection(db, 'chats', selectedChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ 
        id: d.id, 
        chatId: selectedChat.id,
        ...d.data() 
      } as MessageData))
      
      // Sort by timestamp
      msgs.sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || 0
        const bTime = b.timestamp?.toMillis?.() || 0
        return aTime - bTime
      })
      
      setMessages(msgs)
      
      // Update selectedChat with messages
      setSelectedChat(prev => prev ? { ...prev, messages: msgs } : null)
    })

    return () => unsubscribe()
  }, [selectedChat?.id])

  // Block user
  const blockUser = async (uid: string) => {
    if (!user) return
    const userRef = doc(db, 'users', user.id)
    await updateDoc(userRef, { blockedUsers: arrayUnion(uid) })
    setUser((prev) =>
      prev ? { ...prev, blockedUsers: [...(prev.blockedUsers || []), uid] } : prev
    )
    playSound(/*blockSound*/)
  }

  // Unblock user
  const unblockUser = async (uid: string) => {
    if (!user) return
    const userRef = doc(db, 'users', user.id)
    await updateDoc(userRef, { blockedUsers: arrayRemove(uid) })
    setUser((prev) =>
      prev
        ? { ...prev, blockedUsers: (prev.blockedUsers || []).filter((id) => id !== uid) }
        : prev
    )
    playSound(/*unblockSound*/)
  }

  // Group admin: update group name
  const updateGroupName = async (chatId: string, name: string) => {
    await updateDoc(doc(db, 'chats', chatId), { groupName: name })
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, groupName: name } : c))
    )
    playSound(/*editSound*/)
  }

  // Group admin: update group photo
  const updateGroupPhoto = async (chatId: string, file: File) => {
    const storageRef = ref(storage, `group_photos/${chatId}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    await updateDoc(doc(db, 'chats', chatId), { groupPhoto: url })
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, groupPhoto: url } : c))
    )
    playSound(/*editSound*/)
    return url
  }

  // Delete chat function
  const deleteChat = async (chatId: string) => {
    try {
      // Delete the chat document
      const chatRef = doc(db, 'chats', chatId)
      await deleteDoc(chatRef)
      
      // Delete all messages in the chat
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      const messagesSnapshot = await getDocs(messagesRef)
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      
      // Update local state
      setChats(prev => prev.filter(chat => chat.id !== chatId))
      
      // Clear selected chat if it was the deleted one
      setSelectedChat(prev => prev?.id === chatId ? null : prev)
      
      playSound(/*deleteSound*/)
    } catch (error) {
      console.error('Error deleting chat:', error)
      throw error
    }
  }

  // Add or update fetchGroups function if needed
  const fetchGroups = async () => {
    try {
      const groupsQuery = query(collection(db, 'groups'), 
        where('members', 'array-contains', user.uid));
      
      const querySnapshot = await getDocs(groupsQuery);
      
      const groupChats: GroupChat[] = [];
      
      for (const doc of querySnapshot.docs) {
        const groupData = doc.data() as GroupData;
        
        // Create a properly structured group chat object
        const groupChat: GroupChat = {
          id: doc.id,
          isGroup: true,
          groupName: groupData.groupName || 'Group Chat',
          groupPhoto: groupData.groupPhoto || '',
          members: groupData.members || [],
          adminId: groupData.adminId || '',
          lastMessage: groupData.lastMessage || '',
          lastMessageTime: groupData.lastMessageTime,
          messages: [] // Messages will be loaded when chat is selected
        };
        
        groupChats.push(groupChat);
      }
      
      // Update state with group chats
      setChats(prevChats => {
        // Keep direct chats and add group chats
        const directChats = prevChats.filter(chat => !chat.isGroup);
        return [...directChats, ...groupChats];
      });
      
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        user,
        currentUser: user,
        chats,
        selectedChat,
        messages,
        setSelectedChat,
        blockUser,
        unblockUser,
        updateGroupName,
        updateGroupPhoto,
        setChats
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
