import { useEffect, useState } from "react"
import { auth, db, storage } from "../firebase"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  addDoc
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { onAuthStateChanged } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import {
  UserIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
  PencilIcon,
  CalendarIcon,
  Cog6ToothIcon,
  PhotoIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import EditProfile from './EditProfile'

interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  backgroundUrl: string
  role?: string
  friends?: string[]
  nationality?: string
  age?: number
  isAdult?: boolean
  birthDate?: any
  _imageSource?: string
  _profileFieldsFound?: number
  _cacheBreaker?: string
  _lastRefresh?: number
}

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

function Profile() {
  // Core user state
  const [userId, setUserId] = useState("")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [profilePic, setProfilePic] = useState("")
  const [backgroundUrl, setBackgroundUrl] = useState("")
  const [nationality, setNationality] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [isAdult, setIsAdult] = useState(false)
  const [age, setAge] = useState(0)

  // Loading states
  const [initialLoading, setInitialLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Edit form states
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editNationality, setEditNationality] = useState("")
  const [editAge, setEditAge] = useState(0)
  const [editIsAdult, setEditIsAdult] = useState(false)

  // Social features
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('search')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [searchRefreshKey, setSearchRefreshKey] = useState(0)

  // Add connection state
  const [connectionError, setConnectionError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const navigate = useNavigate()

  // Utility functions
  const showNotification = (message: string, type: Notification['type']) => {
    const id = Date.now().toString()
    const notification: Notification = { id, message, type }
    setNotifications(prev => [...prev, notification])
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Start editing mode
  const startEditing = () => {
    setEditDisplayName(displayName)
    setEditBio(bio)
    setEditNationality(nationality)
    setEditAge(age)
    setEditIsAdult(isAdult)
    setIsEditing(true)
  }

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false)
    setEditDisplayName("")
    setEditBio("")
    setEditNationality("")
    setEditAge(0)
    setEditIsAdult(false)
  }

  // Save profile changes
  const saveProfile = async () => {
    if (!currentUser) return

    setSaveLoading(true)
    try {
      const updatedData = {
        displayName: editDisplayName.trim() || username,
        bio: editBio.trim(),
        nationality: editNationality.trim(),
        age: editAge,
        isAdult: editIsAdult,
        updatedAt: serverTimestamp()
      }

      await updateDoc(doc(db, "users", currentUser.uid), updatedData)

      // Update local state
      setDisplayName(updatedData.displayName)
      setBio(updatedData.bio)
      setNationality(updatedData.nationality)
      setAge(updatedData.age)
      setIsAdult(updatedData.isAdult)

      setIsEditing(false)
      showNotification("Profile updated successfully!", "success")
    } catch (error: any) {
      console.error("Error updating profile:", error)
      showNotification("Failed to update profile", "error")
    } finally {
      setSaveLoading(false)
    }
  }

  // Handle profile picture upload
  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    try {
      setActionLoading("profilePic")
      
      const storageRef = ref(storage, `profilePics/${currentUser.uid}/${Date.now()}_${file.name}`)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      await updateDoc(doc(db, "users", currentUser.uid), {
        profileImage: downloadURL,
        updatedAt: serverTimestamp()
      })

      setProfilePic(downloadURL)
      showNotification("Profile picture updated!", "success")
    } catch (error: any) {
      console.error("Error uploading profile picture:", error)
      showNotification("Failed to upload profile picture", "error")
    } finally {
      setActionLoading(null)
    }
  }

  // Enhanced load user profile
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null

    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const data = userDoc.data()
        
        let finalProfilePic = data.profileImage || data.profilePic || ""
        
        return {
          id: userId,
          username: data.username || "",
          displayName: data.displayName || data.username || "",
          profilePic: finalProfilePic,
          backgroundUrl: data.backgroundImage || data.backgroundUrl || "",
          bio: data.bio || "",
          friends: data.friends || [],
          role: data.role || "user",
          nationality: data.nationality || "",
          age: data.age || 0,
          isAdult: data.isAdult || false,
          birthDate: data.birthDate || "",
          _imageSource: data.profileImage ? "ENHANCED-FOUND" : 
                       data.profilePic ? "LEGACY-FOUND" : "ENHANCED-NONE",
          _profileFieldsFound: (data.profileImage ? 1 : 0) + (data.profilePic ? 1 : 0),
          _cacheBreaker: Date.now().toString(),
          _lastRefresh: Date.now()
        }
      }
      return null
    } catch (error) {
      console.error("Error loading user profile:", error)
      return null
    }
  }

  // Send friend request function
  const sendFriendRequest = async (targetUserId: string) => {
    if (!currentUser || actionLoading === targetUserId) return
    
    setActionLoading(targetUserId)
    
    try {
      const existingRequestQuery = query(
        collection(db, "friendRequests"),
        where("from", "==", currentUser.uid),
        where("to", "==", targetUserId)
      )
      const existingRequests = await getDocs(existingRequestQuery)
      
      if (!existingRequests.empty) {
        showNotification("Friend request already sent!", "info")
        return
      }
      
      await addDoc(collection(db, "friendRequests"), {
        from: currentUser.uid,
        to: targetUserId,
        createdAt: serverTimestamp(),
        status: "pending"
      })
      
      showNotification("Friend request sent!", "success")
    } catch (error: any) {
      console.error("Error sending friend request:", error)
      showNotification("Failed to send friend request", "error")
    } finally {
      setActionLoading(null)
    }
  }

  // Update profile function for EditProfile component
  const handleProfileUpdate = async (newUsername: string, newDisplayName: string): Promise<boolean> => {
    if (!currentUser) return false
    
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        username: newUsername,
        displayName: newDisplayName,
        updatedAt: serverTimestamp()
      })
      
      // Update local state
      setUsername(newUsername)
      setDisplayName(newDisplayName)
      
      return true
    } catch (error) {
      console.error("Error updating profile:", error)
      return false
    }
  }

  // Handle edit complete
  const handleEditComplete = () => {
    setIsEditing(false)
    // Refresh user data
    if (currentUser) {
      getDoc(doc(db, "users", currentUser.uid)).then((userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)
          setUsername(data.username || "")
          setDisplayName(data.displayName || "")
          setBio(data.bio || "")
          setProfilePic(data.profileImage || data.profilePic || "")
          setBackgroundUrl(data.backgroundImage || data.backgroundUrl || "")
          setNationality(data.nationality || "")
          setBirthDate(data.birthDate || "")
          setAge(data.age || 0)
          setIsAdult(data.isAdult || false)
        }
      })
    }
  }

  // Enhanced error handling for Firebase operations
  const handleFirebaseError = (error: any, operation: string) => {
    console.error(`Firebase error in ${operation}:`, error);
    
    // Use the enhanced error handler from firebase.ts
    const isWebChannelError = error.message?.includes('WebChannelConnection') || 
                              error.message?.includes('Bad Request') ||
                              error.code === 'unavailable';
    
    if (error.code === 'permission-denied' || 
        error.message?.includes('Missing or insufficient permissions')) {
      setConnectionError(true);
      showNotification("Access denied. Running in limited mode.", "warning");
    } else if (isWebChannelError) {
      setConnectionError(true);
      showNotification("Connection issues detected. Some features may be limited.", "warning");
    } else if (error.code === 'auth/network-request-failed') {
      setConnectionError(true);
      showNotification("Network error. Please check your connection.", "warning");
    } else if (error.code === 'auth/user-token-expired') {
      showNotification("Session expired. Please refresh the page.", "error");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showNotification(`Error: ${error.message || 'Unknown error occurred'}`, "error");
    }
  };

  // Add resilient retry mechanism that handles WebChannel errors
  const retryOperation = async (operation: () => Promise<any>, operationName: string) => {
    try {
      setConnectionError(false);
      return await operation();
    } catch (error: any) {
      // Use enhanced error handling
      const isWebChannelError = error.message?.includes('WebChannelConnection') || 
                                error.message?.includes('Bad Request') ||
                                error.code === 'unavailable';
      
      if (isWebChannelError) {
        console.warn(`WebChannel error in ${operationName}, continuing with fallback`);
        setConnectionError(true);
        // Don't throw for WebChannel errors, just log and continue
        return null;
      }
      
      handleFirebaseError(error, operationName);
      throw error;
    }
  };

  // Enhanced initialization with permission-aware retry logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        setUserId(user.uid)
        setInitialLoading(true)

        try {
          // Retry user data loading with permission awareness
          await retryOperation(async () => {
            try {
              const userDoc = await getDoc(doc(db, "users", user.uid))
              if (userDoc.exists()) {
                const data = userDoc.data()
                setUserData(data)
                
                setUsername(data.username || "")
                setDisplayName(data.displayName || "")
                setBio(data.bio || "")
                setProfilePic(data.profileImage || data.profilePic || "")
                setBackgroundUrl(data.backgroundImage || data.backgroundUrl || "")
                setNationality(data.nationality || "")
                setBirthDate(data.birthDate || "")
                setAge(data.age || 0)
                setIsAdult(data.isAdult || false)

                // Load friends with error handling
                const friendIds: string[] = data.friends || []
                const friendsData = []
                for (const fid of friendIds) {
                  try {
                    const friendProfile = await loadUserProfile(fid)
                    if (friendProfile) friendsData.push(friendProfile)
                  } catch (error) {
                    console.warn(`Failed to load friend profile ${fid}:`, error)
                  }
                }
                setFriends(friendsData)

                // Load friend requests with permission error handling
                try {
                  const q = query(collection(db, "friendRequests"), where("to", "==", user.uid))
                  const snap = await getDocs(q)
                  const requests = []
                  
                  for (const docSnap of snap.docs) {
                    try {
                      const req = docSnap.data()
                      const fromUserDoc = await getDoc(doc(db, "users", req.from))
                      requests.push({
                        id: docSnap.id,
                        from: req.from,
                        to: req.to,
                        fromUser: fromUserDoc.exists() ? fromUserDoc.data() : null,
                      })
                    } catch (error) {
                      console.warn(`Failed to load friend request ${docSnap.id}:`, error)
                    }
                  }
                  setFriendRequests(requests)
                } catch (error: any) {
                  if (error.code === 'permission-denied') {
                    console.warn("Friend requests access denied - feature disabled for this user")
                    setFriendRequests([])
                  } else {
                    console.warn("Error loading friend requests:", error)
                    setFriendRequests([])
                  }
                }

              } else {
                // Create new profile with permission error handling
                try {
                  const newProfile = {
                    username: user.email?.split('@')[0] || "User",
                    displayName: user.email?.split('@')[0] || "User",
                    bio: "",
                    profilePic: "",
                    backgroundUrl: "",
                    email: user.email || "",
                    friends: [],
                    role: "user",
                    nationality: "",
                    age: 0,
                    isAdult: false,
                    birthDate: "",
                    createdAt: new Date()
                  }

                  await setDoc(doc(db, "users", user.uid), newProfile)
                  setUserData(newProfile)
                  
                  setUsername(newProfile.username)
                  setDisplayName(newProfile.displayName)
                } catch (createError: any) {
                  if (createError.code === 'permission-denied') {
                    console.warn("Cannot create user profile - using auth fallback data")
                    // Use auth-based fallback data
                    const fallbackProfile = {
                      username: user.email?.split('@')[0] || "User",
                      displayName: user.displayName || user.email?.split('@')[0] || "User",
                      bio: "",
                      profilePic: user.photoURL || "",
                      backgroundUrl: "",
                      email: user.email || "",
                      friends: [],
                      role: "user",
                      nationality: "",
                      age: 0,
                      isAdult: false,
                      birthDate: "",
                    }
                    setUserData(fallbackProfile)
                    setUsername(fallbackProfile.username)
                    setDisplayName(fallbackProfile.displayName)
                    setProfilePic(fallbackProfile.profilePic)
                    
                    showNotification("Limited access mode - some features may be unavailable", "warning")
                  } else {
                    throw createError;
                  }
                }
              }
            } catch (error: any) {
              if (error.code === 'permission-denied') {
                // Use complete auth fallback when Firestore is completely inaccessible
                console.warn("Firestore completely inaccessible - using full auth fallback")
                const authFallback = {
                  username: user.email?.split('@')[0] || "User",
                  displayName: user.displayName || user.email?.split('@')[0] || "User",
                  bio: "Profile data unavailable",
                  profilePic: user.photoURL || "",
                  backgroundUrl: "",
                  nationality: "",
                  age: 0,
                  isAdult: false,
                  birthDate: "",
                }
                
                setUserData(authFallback)
                setUsername(authFallback.username)
                setDisplayName(authFallback.displayName)
                setBio(authFallback.bio)
                setProfilePic(authFallback.profilePic)
                setFriends([])
                setFriendRequests([])
                
                showNotification("Running in limited mode due to access restrictions", "warning")
              } else {
                throw error;
              }
            }
          }, "user data loading");
        } catch (error: any) {
          handleFirebaseError(error, "profile initialization");
        } finally {
          setInitialLoading(false)
        }
      } else {
        navigate("/login")
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      handleFirebaseError(error, "authentication");
    })

    return () => unsubscribe()
  }, [navigate, retryCount])

  // Add connection retry button
  const handleRetryConnection = () => {
    setRetryCount(prev => prev + 1);
    setConnectionError(false);
    showNotification("Retrying connection...", "info");
  };

  // Enhanced search functionality
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      
      try {
        const usersQuery = query(collection(db, "users"), limit(100))
        const usersSnapshot = await getDocs(usersQuery)
        
        const results: UserProfile[] = []
        const searchTermLower = searchTerm.toLowerCase()
        
        for (const userDoc of usersSnapshot.docs) {
          try {
            const userData = userDoc.data()
            const username = userData.username?.toLowerCase() || ''
            const displayName = userData.displayName?.toLowerCase() || ''
            
            if ((username.includes(searchTermLower) || displayName.includes(searchTermLower)) && 
                userDoc.id !== userId) {
              
              const enhancedProfile = await loadUserProfile(userDoc.id)
              if (enhancedProfile) {
                results.push(enhancedProfile)
              }
            }
          } catch (error) {
            console.warn(`Error processing user ${userDoc.id}:`, error)
          }
        }
        
        setSearchResults(results.slice(0, 20))
        
      } catch (error: any) {
        console.error("Error in search:", error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    const timeoutId = setTimeout(searchUsers, 800)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, userId, searchRefreshKey])

  // Add friend request handling functions
  const acceptFriendRequest = async (requestId: string, fromUserId: string) => {
    if (!currentUser || actionLoading === requestId) return
    
    setActionLoading(requestId)
    
    try {
      // Add friend to current user's friends list
      const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid))
      const currentUserData = currentUserDoc.data()
      const currentFriends = currentUserData?.friends || []
      
      if (!currentFriends.includes(fromUserId)) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          friends: [...currentFriends, fromUserId],
          updatedAt: serverTimestamp()
        })
      }
      
      // Add current user to friend's friends list
      const fromUserDoc = await getDoc(doc(db, "users", fromUserId))
      const fromUserData = fromUserDoc.data()
      const fromUserFriends = fromUserData?.friends || []
      
      if (!fromUserFriends.includes(currentUser.uid)) {
        await updateDoc(doc(db, "users", fromUserId), {
          friends: [...fromUserFriends, currentUser.uid],
          updatedAt: serverTimestamp()
        })
      }
      
      // Delete the friend request
      await deleteDoc(doc(db, "friendRequests", requestId))
      
      // Update local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Reload friends list
      const updatedUserDoc = await getDoc(doc(db, "users", currentUser.uid))
      const updatedData = updatedUserDoc.data()
      const friendIds: string[] = updatedData?.friends || []
      const friendsData = []
      for (const fid of friendIds) {
        try {
          const friendProfile = await loadUserProfile(fid)
          if (friendProfile) friendsData.push(friendProfile)
        } catch (error) {
          console.warn(`Failed to load friend profile ${fid}:`, error)
        }
      }
      setFriends(friendsData)
      
      showNotification("Friend request accepted! 🎉", "success")
    } catch (error: any) {
      console.error("Error accepting friend request:", error)
      handleFirebaseError(error, "accept friend request")
    } finally {
      setActionLoading(null)
    }
  }

  const rejectFriendRequest = async (requestId: string) => {
    if (!currentUser || actionLoading === requestId) return
    
    setActionLoading(requestId)
    
    try {
      // Delete the friend request
      await deleteDoc(doc(db, "friendRequests", requestId))
      
      // Update local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId))
      
      showNotification("Friend request declined", "info")
    } catch (error: any) {
      console.error("Error rejecting friend request:", error)
      handleFirebaseError(error, "reject friend request")
    } finally {
      setActionLoading(null)
    }
  }

  // Add friend removal function
  const removeFriend = async (friendId: string, friendName: string) => {
    if (!currentUser || actionLoading === friendId) return
    
    const confirmed = window.confirm(
      `Are you sure you want to remove ${friendName} from your friends list?\n\n` +
      "This action will:\n" +
      "• Remove them from your friends list\n" +
      "• Remove you from their friends list\n" +
      "• This action cannot be undone\n\n" +
      "You can send them a new friend request later if needed."
    )
    
    if (!confirmed) return
    
    setActionLoading(friendId)
    
    try {
      // Remove friend from current user's friends list
      const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid))
      const currentUserData = currentUserDoc.data()
      const currentFriends = currentUserData?.friends || []
      
      const updatedCurrentFriends = currentFriends.filter((id: string) => id !== friendId)
      
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: updatedCurrentFriends,
        updatedAt: serverTimestamp()
      })
      
      // Remove current user from friend's friends list
      const friendDoc = await getDoc(doc(db, "users", friendId))
      if (friendDoc.exists()) {
        const friendData = friendDoc.data()
        const friendFriends = friendData?.friends || []
        
        const updatedFriendFriends = friendFriends.filter((id: string) => id !== currentUser.uid)
        
        await updateDoc(doc(db, "users", friendId), {
          friends: updatedFriendFriends,
          updatedAt: serverTimestamp()
        })
      }
      
      // Update local state
      setFriends(prev => prev.filter(friend => friend.id !== friendId))
      
      showNotification(`${friendName} has been removed from your friends list`, "info")
    } catch (error: any) {
      console.error("Error removing friend:", error)
      handleFirebaseError(error, "remove friend")
    } finally {
      setActionLoading(null)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
      {backgroundUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-500 transform ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="relative z-10 pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          
          {/* Profile Header */}
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className={`w-32 h-32 mx-auto rounded-full overflow-hidden border-4 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center relative ${
                isAdult ? 'border-red-500/80' : 'border-white/30'
              }`}>
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-white text-3xl font-bold">
                    {getInitials(displayName || username || 'U')}
                  </span>
                )}
                
                {/* Option 1: Small centered badge */}
                {isAdult && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg z-10">
                    18+
                  </div>
                )}
                
                {/* Option 2: Corner ribbon style - UNCOMMENT TO USE THIS INSTEAD
                {isAdult && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-700 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-xl transform rotate-12 z-10">
                    18+
                  </div>
                )}
                */}
                
                {/* Option 3: Glow effect around entire circle - UNCOMMENT TO USE THIS INSTEAD
                {isAdult && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-pulse"></div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-lg z-10">
                      18+
                    </div>
                  </>
                )}
                */}
                
                {/* Option 4: Top banner style - UNCOMMENT TO USE THIS INSTEAD
                {isAdult && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full border-2 border-white shadow-lg z-10">
                    18+
                  </div>
                )}
                */}
                
                {/* Camera icon for profile pic upload */}
                <label className="absolute inset-0 cursor-pointer bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-full">
                  <PhotoIcon className="h-8 w-8 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicUpload}
                    className="hidden"
                  />
                </label>
                
                {actionLoading === "profilePic" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <h1 className="text-4xl font-bold text-white">
                  {displayName || username}
                </h1>
              </div>
              
              {bio && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto border border-white/20">
                  <p className="text-gray-200 text-lg leading-relaxed">{bio}</p>
                </div>
              )}
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-300">
                <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>{friends.length} Friends</span>
                </span>
                <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <UserIcon className="h-4 w-4" />
                  <span>@{username}</span>
                </span>
                {age > 0 && (
                  <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{age} years old</span>
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={startEditing}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <PencilIcon className="h-5 w-5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full EditProfile Component Modal */}
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="bg-gray-900 rounded-2xl border border-white/20 shadow-2xl">
                  <div className="flex items-center justify-between p-6 border-b border-white/20">
                    <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                      <PencilIcon className="h-6 w-6" />
                      <span>Edit Profile</span>
                    </h2>
                    <button
                      onClick={cancelEditing}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <EditProfile
                      user={currentUser}
                      userData={userData}
                      onUpdate={handleProfileUpdate}
                      error=""
                      onSaveComplete={handleEditComplete}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex justify-center">
            <div className="flex bg-white/20 backdrop-blur-sm rounded-xl p-1 space-x-1 border border-white/30">
              {[
                { id: 'search', label: 'Search Users', icon: MagnifyingGlassIcon },
                { id: 'friends', label: 'Friends', icon: UserGroupIcon },
                { id: 'requests', label: 'Requests', icon: UserPlusIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'friends' | 'requests' | 'search')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white/30 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                  {tab.id === 'requests' && friendRequests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                      {friendRequests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
            
            {activeTab === 'search' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <MagnifyingGlassIcon className="h-6 w-6" />
                  <span>Search Users</span>
                </h2>

                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Search by username or display name"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>

                {searchLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-300 mt-2">Searching...</p>
                  </div>
                ) : searchResults.length === 0 && searchTerm ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No users found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((user, index) => {
                      const uniqueKey = `search-${user.id}-${user._lastRefresh || Date.now()}-${searchRefreshKey}-${user._cacheBreaker || ''}`;
                      
                      return (
                        <div 
                          key={uniqueKey} 
                          className="bg-white/10 rounded-lg p-4 flex items-center space-x-4 transition-all duration-500 hover:bg-white/20 hover:transform hover:scale-105"
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            {user.profilePic ? (
                              <img 
                                src={user.profilePic}
                                alt={user.displayName} 
                                className="w-full h-full object-cover"
                                loading="eager"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.fallback-initials')) {
                                    const initialsSpan = document.createElement('span');
                                    initialsSpan.className = 'text-white font-bold text-lg fallback-initials';
                                    initialsSpan.textContent = getInitials(user.displayName || user.username);
                                    parent.appendChild(initialsSpan);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-white font-bold text-lg">
                                {getInitials(user.displayName || user.username)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate text-lg">{user.displayName || user.username}</h3>
                            <p className="text-gray-300 text-sm truncate">
                              {user.bio || 'No bio available'}
                            </p>
                            <p className="text-gray-400 text-xs">@{user.username}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/user/${user.username}`)}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition-all duration-300 flex items-center justify-center hover:scale-110"
                              title="View Profile"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => sendFriendRequest(user.id)}
                              disabled={actionLoading === user.id}
                              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white p-3 rounded-lg transition-all duration-300 flex items-center justify-center hover:scale-110"
                              title="Send Friend Request"
                            >
                              {actionLoading === user.id ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              ) : (
                                <UserPlusIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <UserGroupIcon className="h-6 w-6" />
                  <span>Your Friends ({friends.length})</span>
                </h2>

                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No friends yet</p>
                    <p className="text-gray-500 text-sm">Start by searching for users to add as friends!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friends.map((friend, index) => (
                      <div 
                        key={friend.id} 
                        className="bg-white/10 rounded-lg p-4 flex items-center space-x-4 hover:bg-white/20 transition-all duration-300"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          {friend.profilePic ? (
                            <img 
                              src={friend.profilePic} 
                              alt={friend.displayName} 
                              className="w-full h-full object-cover" 
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-white font-bold">
                              {getInitials(friend.displayName || friend.username)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{friend.displayName || friend.username}</h3>
                          <p className="text-gray-300 text-sm truncate">{friend.bio}</p>
                          <p className="text-gray-400 text-xs">@{friend.username}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/user/${friend.username}`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-300 flex items-center justify-center"
                            title="View Profile"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFriend(friend.id, friend.displayName || friend.username)}
                            disabled={actionLoading === friend.id}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all duration-300 flex items-center justify-center"
                            title="Remove Friend"
                          >
                            {actionLoading === friend.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <UserPlusIcon className="h-6 w-6" />
                  <span>Friend Requests ({friendRequests.length})</span>
                </h2>

                {friendRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlusIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No pending friend requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            {request.fromUser?.profileImage || request.fromUser?.profilePic ? (
                              <img 
                                src={request.fromUser.profileImage || request.fromUser.profilePic} 
                                alt={request.fromUser.displayName || request.fromUser.username} 
                                className="w-full h-full object-cover rounded-full" 
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-white font-bold">
                                {getInitials(request.fromUser?.displayName || request.fromUser?.username || 'U')}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-medium">
                              {request.fromUser?.displayName || request.fromUser?.username || 'Unknown User'}
                            </h3>
                            <p className="text-gray-400 text-sm">wants to be your friend</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => acceptFriendRequest(request.id, request.from)}
                            disabled={actionLoading === request.id}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all duration-300 flex items-center justify-center"
                            title="Accept Friend Request"
                          >
                            {actionLoading === request.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                              <CheckIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button 
                            onClick={() => rejectFriendRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all duration-300 flex items-center justify-center"
                            title="Decline Friend Request"
                          >
                            {actionLoading === request.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                              <XMarkIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-red-500/90 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <span>Connection lost. Some features may not work properly.</span>
            </div>
            <button
              onClick={handleRetryConnection}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile