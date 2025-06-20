import { useEffect, useState } from "react"
import { auth, db } from "../firebase"
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore"
import { onAuthStateChanged, signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  CogIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

interface UserSettings {
  notifications: boolean
  privacy: 'public' | 'friends' | 'private'
  theme: 'dark' | 'light' | 'auto'
  language: string
  emailUpdates: boolean
  dataCollection: boolean
}

interface UserProfile {
  id: string
  username: string
  displayName: string
  email: string
  profilePic: string
  role?: string
  isAdult?: boolean
  createdAt?: any
}

function Settings() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    privacy: 'public',
    theme: 'dark',
    language: 'en',
    emailUpdates: false,
    dataCollection: true
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  
  // Connection state management
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)

  // Clean up the firestoreListeners state management
  const [firestoreListeners, setFirestoreListeners] = useState<(() => void)[]>([]);

  const navigate = useNavigate()

  // Enhanced notification system
  const showNotification = (message: string, type: "success" | "error" | "info" | "warning") => {
    const notification = document.createElement('div')
    const bgColor = {
      success: 'bg-green-500/90',
      error: 'bg-red-500/90', 
      info: 'bg-blue-500/90',
      warning: 'bg-yellow-500/90'
    }[type]
    
    notification.className = `fixed top-6 right-6 ${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300 backdrop-blur-md border border-white/20`
    notification.textContent = message
    document.body.appendChild(notification)
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)'
      notification.style.opacity = '1'
    }, 100)
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)'
      notification.style.opacity = '0'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 4000)
  }

  // Enhanced error handling with retry logic
  const handleFirestoreError = async (error: any, operation: string, retryFn?: () => Promise<void>, maxRetries = 3) => {
    console.error(`Firestore error in ${operation}:`, error)
    setLastError(error?.message || 'Connection error')
    
    // Check for connection-related errors
    const isConnectionError = 
      error?.code === 'unavailable' || 
      error?.code === 'deadline-exceeded' || 
      error?.code === 'internal' ||
      error?.code === 'cancelled' ||
      error?.message?.includes('Failed to get document') ||
      error?.message?.includes('WebChannel') ||
      error?.message?.includes('transport errored') ||
      error?.message?.includes('Bad Request')
    
    if (isConnectionError && retryFn && retryAttempts < maxRetries) {
      setConnectionState('reconnecting')
      const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempts), 10000)
      
      showNotification(`🔄 Connection issue detected. Retrying in ${Math.ceil(backoffDelay/1000)}s... (${retryAttempts + 1}/${maxRetries})`, "warning")
      
      setTimeout(async () => {
        try {
          setRetryAttempts(prev => prev + 1)
          await retryFn()
          setConnectionState('connected')
          setRetryAttempts(0)
          setLastError(null)
          showNotification("✅ Connection restored!", "success")
        } catch (retryError) {
          await handleFirestoreError(retryError, `${operation} (retry)`, retryFn, maxRetries)
        }
      }, backoffDelay)
    } else if (retryAttempts >= maxRetries) {
      setConnectionState('disconnected')
      showNotification("❌ Connection failed after multiple attempts. Please refresh the page.", "error")
    } else {
      // Handle other types of errors
      if (error?.code === 'permission-denied') {
        showNotification("❌ Permission denied. Please sign in again.", "error")
        setTimeout(() => navigate("/login"), 2000)
      } else if (error?.code === 'unauthenticated') {
        showNotification("❌ Authentication expired. Please sign in again.", "error")
        setTimeout(() => navigate("/login"), 2000)
      } else {
        showNotification(`❌ Error in ${operation}: ${error?.message || 'Unknown error'}`, "error")
      }
    }
  }

  // Load user data with enhanced error handling
  const loadUserData = async (userId: string) => {
    if (!userId) return

    const loadOperation = async () => {
      try {
        // Load user profile with timeout
        const userDocPromise = getDoc(doc(db, "users", userId))
        const settingsDocPromise = getDoc(doc(db, "userSettings", userId))
        
        const [userDoc, settingsDoc] = await Promise.all([
          userDocPromise,
          settingsDocPromise
        ])

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserProfile({
            id: userId,
            username: userData.username || "",
            displayName: userData.displayName || "",
            email: userData.email || user?.email || "",
            profilePic: userData.profilePic || "",
            role: userData.role || "user",
            isAdult: userData.isAdult || false,
            createdAt: userData.createdAt
          })
        } else {
          // If no Firestore document exists, use Firebase Auth data
          setUserProfile({
            id: userId,
            username: user?.displayName || "",
            displayName: user?.displayName || "",
            email: user?.email || "",
            profilePic: "",
            role: "user",
            isAdult: false,
            createdAt: null
          })
        }

        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data()
          setSettings({
            notifications: settingsData.notifications ?? true,
            privacy: settingsData.privacy || 'public',
            theme: settingsData.theme || 'dark',
            language: settingsData.language || 'en',
            emailUpdates: settingsData.emailUpdates ?? false,
            dataCollection: settingsData.dataCollection ?? true
          })
        }

        setConnectionState('connected')
      } catch (error) {
        throw error // Re-throw to be handled by error handler
      }
    }

    try {
      await loadOperation()
    } catch (error: any) {
      await handleFirestoreError(error, 'loading user data', loadOperation)
    }
  }

  // Enhanced auth state monitoring
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser ? "User logged in" : "User logged out")
      
      if (currentUser) {
        setUser(currentUser)
        setRetryAttempts(0) // Reset retry counter
        
        const loadUserData = async () => {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid))
            const settingsDoc = await getDoc(doc(db, "userSettings", currentUser.uid))

            if (userDoc.exists()) {
              const userData = userDoc.data()
              setUserProfile({
                id: currentUser.uid,
                username: userData.username || "",
                displayName: userData.displayName || "",
                email: userData.email || currentUser.email || "",
                profilePic: userData.profilePic || "",
                role: userData.role || "user",
                isAdult: userData.isAdult || false,
                createdAt: userData.createdAt
              })
            } else {
              // If no Firestore document exists, use Firebase Auth data
              setUserProfile({
                id: currentUser.uid,
                username: currentUser.displayName || "",
                displayName: currentUser.displayName || "",
                email: currentUser.email || "",
                profilePic: "",
                role: "user",
                isAdult: false,
                createdAt: null
              })
            }

            if (settingsDoc.exists()) {
              const settingsData = settingsDoc.data()
              setSettings({
                notifications: settingsData.notifications ?? true,
                privacy: settingsData.privacy || 'public',
                theme: settingsData.theme || 'dark',
                language: settingsData.language || 'en',
                emailUpdates: settingsData.emailUpdates ?? false,
                dataCollection: settingsData.dataCollection ?? true
              })
            }

            setConnectionState('connected')
          } catch (error) {
            await handleFirestoreError(error, 'loading user data', loadUserData)
          }
        }

        await loadUserData()
      } else {
        navigate("/login")
      }
      setLoading(false)
    })

    return () => {
      unsubscribeAuth()
      // Clean up Firestore listeners
      firestoreListeners.forEach(unsub => unsub())
    }
  }, [navigate, firestoreListeners])

  // Clean up the Firestore listeners effect
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    if (user?.uid) {
      // Example: User data listener
      const userUnsubscribe = onSnapshot(doc(db, "users", user.uid), 
        (docSnap) => {
          if (docSnap.exists()) {
            // Handle user data updates if needed
          }
        }, 
        (error) => {
          console.error("Firestore listener error:", error);
        }
      );
      
      unsubscribers.push(userUnsubscribe);
      
      // Store all listener unsubscribe functions
      setFirestoreListeners(unsubscribers);
    }
    
    // Clean up function - unsubscribe from all listeners when component unmounts
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      setFirestoreListeners([]);
    };
  }, [user]);

  // Enhanced connection monitoring
  useEffect(() => {
    const checkConnection = () => {
      if (!navigator.onLine) {
        setConnectionState('disconnected')
        showNotification("📡 You're offline. Please check your internet connection.", "warning")
      } else if (connectionState === 'disconnected') {
        setConnectionState('reconnecting')
        showNotification("🔄 Connection restored. Refreshing data...", "info")
        
        // Retry loading data after connection restore
        if (user?.uid) {
          setTimeout(() => {
            loadUserData(user.uid)
          }, 1000)
        }
      }
    }

    window.addEventListener('online', checkConnection)
    window.addEventListener('offline', checkConnection)
    
    return () => {
      window.removeEventListener('online', checkConnection)
      window.removeEventListener('offline', checkConnection)
    }
  }, [connectionState, user])

  // Enhanced save settings with privacy sync
  const handleSaveSettings = async () => {
    if (!user || saving) return
    
    setSaving(true)
    
    const saveOperation = async () => {
      try {
        // Save to userSettings collection
        await setDoc(
          doc(db, "userSettings", user.uid),
          {
            ...settings,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
        
        // CRITICAL: Also update the main user document with privacy setting
        // This is what the UserProfile component checks
        await setDoc(
          doc(db, "users", user.uid),
          {
            privacy: settings.privacy,
            notifications: settings.notifications,
            emailUpdates: settings.emailUpdates,
            dataCollection: settings.dataCollection,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
        
        console.log("✅ Privacy settings saved:", {
          privacy: settings.privacy,
          userId: user.uid
        });
        
        showNotification("✅ Settings saved successfully!", "success")
        
        // Force a small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showNotification(`🔒 Privacy set to: ${settings.privacy}`, "info")
      } catch (error) {
        console.error("Error saving settings:", error);
        throw error; // Re-throw to be handled by error handler
      }
    }

    try {
      await saveOperation()
    } catch (error: any) {
      await handleFirestoreError(error, 'saving settings', saveOperation)
    } finally {
      setSaving(false)
    }
  }

  // Enhanced account deletion with better error handling
  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to permanently delete your account? This cannot be undone.")) {
      return;
    }
    
    setLoading(true); // Assuming you have a loading state
    
    try {
      // Get the current auth user directly from Firebase
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      // Delete Firestore user data
      try {
        await deleteDoc(doc(db, "users", user.uid));
        console.log("User document deleted successfully");
      } catch (firestoreError) {
        console.error("Error deleting user document:", firestoreError);
        // Continue with account deletion anyway
      }
      
      // Delete the authentication user
      await deleteUser(user);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-6 right-6 bg-green-500/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300';
      notification.textContent = '✅ Your account has been successfully deleted.';
      document.body.appendChild(notification);
      
      // Navigate to login page IMMEDIATELY after deletion
      navigate("/login", { replace: true });
      
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 400);
      }, 3000);
      
    } catch (error) {
      console.error("Error deleting account:", error);
      
      let errorMessage = "Failed to delete account. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("requires-recent-login")) {
          errorMessage = "For security reasons, please log in again before deleting your account.";
          
          // Sign out and redirect to login page
          await auth.signOut();
          navigate("/login", { replace: true });
        }
      }
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-6 right-6 bg-red-500/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300';
      notification.textContent = `❌ ${errorMessage}`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 400);
      }, 5000);
    } finally {
      setLoading(false);
    }
  }

  // Add helper function for privacy description
  const getPrivacyDescription = (privacy: 'public' | 'friends' | 'private') => {
    switch (privacy) {
      case 'public':
        return 'Anyone can view your profile and posts'
      case 'friends':
        return 'Only your friends can view your profile and posts'
      case 'private':
        return 'Only you can view your profile. Others will see "Profile Not Available"'
      default:
        return 'Unknown privacy setting'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Settings...</p>
        </div>
      </div>
    )
  }

  // The return statement with enhanced UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="fixed inset-0">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-purple-900/30 to-black/40 animate-gradient-slow"></div>
        
        {/* Improved glowing orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse-slow opacity-70"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-fuchsia-600/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse-slow animation-delay-2000 opacity-70"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse-slow animation-delay-4000 opacity-50"></div>
        
        {/* Animated stars/particles */}
        <div className="stars-container">
          {Array(20).fill(0).map((_, index) => (
            <div 
              key={index}
              className="absolute rounded-full bg-white"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                opacity: Math.random() * 0.7 + 0.3,
                animation: `twinkle ${Math.random() * 5 + 5}s infinite ${Math.random() * 5}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Connection Status Indicator - Enhanced */}
      {connectionState !== 'connected' && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium backdrop-blur-xl border transition-all duration-500 ${
          connectionState === 'reconnecting' 
            ? 'bg-amber-500/30 border-amber-400/50 text-amber-100 shadow-lg shadow-amber-500/20' 
            : 'bg-red-500/30 border-red-400/50 text-red-100 shadow-lg shadow-red-500/20'
        }`}>
          <div className="flex items-center space-x-3">
            {connectionState === 'reconnecting' ? (
              <>
                <div className="w-5 h-5 border-2 border-amber-100/70 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Reconnecting<span className="animate-ellipsis">...</span></span>
              </>
            ) : (
              <>
                <WifiIcon className="h-5 w-5 text-red-300" />
                <span className="font-medium">Connection Lost</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          {/* Enhanced Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border border-white/10 shadow-xl mb-4">
              <CogIcon className="h-10 w-10 text-cyan-300" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent mb-2">
              Settings
            </h1>
            <p className="text-gray-300 text-sm">Customize your Legacy experience</p>
          </motion.div>

          {/* Settings Content - With enhanced glass cards */}
          <div className="space-y-6">
            {/* Profile Overview - Enhanced Glass Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-white/20"
            >
              {/* Card Background with inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-white/10 to-purple-500/10 backdrop-blur-xl"></div>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-xl"></div>
              
              {/* Card Content */}
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/30 backdrop-blur-sm">
                    <UserCircleIcon className="h-5 w-5 text-blue-300" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-200 to-blue-300 bg-clip-text text-transparent">
                    Profile Overview
                  </span>
                </h2>
                
                {userProfile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <div className="group">
                        <label className="block text-gray-300 text-xs font-medium mb-2 transition-colors group-hover:text-cyan-300">Username</label>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-white text-sm border border-white/10 transition-all duration-300 group-hover:border-cyan-500/30 group-hover:bg-white/15 group-hover:shadow-lg group-hover:shadow-cyan-500/10">
                          @{userProfile.username || 'Not set'}
                        </div>
                      </div>
                      <div className="group">
                        <label className="block text-gray-300 text-xs font-medium mb-2 transition-colors group-hover:text-cyan-300">Display Name</label>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-white text-sm border border-white/10 transition-all duration-300 group-hover:border-cyan-500/30 group-hover:bg-white/15 group-hover:shadow-lg group-hover:shadow-cyan-500/10">
                          {userProfile.displayName || 'Not set'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="group">
                        <label className="block text-gray-300 text-xs font-medium mb-2 transition-colors group-hover:text-cyan-300">Email</label>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-white text-sm border border-white/10 transition-all duration-300 group-hover:border-cyan-500/30 group-hover:bg-white/15 group-hover:shadow-lg group-hover:shadow-cyan-500/10">
                          <span className="block" title={userProfile.email || user?.email}>
                            {userProfile.email || user?.email || 'No email found'}
                          </span>
                        </div>
                      </div>
                      <div className="group">
                        <label className="block text-gray-300 text-xs font-medium mb-2 transition-colors group-hover:text-cyan-300">Account Type</label>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-white text-sm border border-white/10 transition-all duration-300 group-hover:border-cyan-500/30 group-hover:bg-white/15 group-hover:shadow-lg group-hover:shadow-cyan-500/10 flex items-center">
                          <span>{userProfile.isAdult ? '18+ Verified' : 'Standard'}</span>
                          {userProfile.isAdult && <span className="ml-2 text-red-400 text-xs">🔞</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Privacy & Security Settings - Enhanced Glass Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl border border-white/20"
            >
              {/* Card Background with inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-white/10 to-blue-500/10 backdrop-blur-xl"></div>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-xl"></div>
              
              {/* Card Content */}
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-green-500/30 backdrop-blur-sm">
                    <ShieldCheckIcon className="h-5 w-5 text-green-300" />
                  </div>
                  <span className="bg-gradient-to-r from-green-200 to-emerald-300 bg-clip-text text-transparent">
                    Privacy & Security
                  </span>
                </h2>
                
                <div className="space-y-5">
                  {/* Privacy Level - Enhanced */}
                  <div>
                    <label className="block text-white font-medium mb-3 text-sm">
                      Profile Visibility
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          value: 'public' as const,
                          label: 'Public',
                          desc: 'Everyone can view',
                          icon: '🌍'
                        },
                        {
                          value: 'friends' as const,
                          label: 'Friends Only',
                          desc: 'Friends can view',
                          icon: '👥'
                        },
                        {
                          value: 'private' as const,
                          label: 'Private',
                          desc: 'Only you can view',
                          icon: '🔒'
                        }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSettings(prevSettings => ({ ...prevSettings, privacy: option.value }))
                          }}
                          className={`p-3 rounded-xl text-left transition-all duration-300 border backdrop-blur-sm ${
                            settings.privacy === option.value
                              ? 'bg-gradient-to-br from-blue-600/40 to-blue-400/20 border-blue-400/50 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                              : 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/15 hover:border-white/20 hover:scale-[1.01]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{option.icon}</span>
                            <div className="font-semibold text-sm">{option.label}</div>
                          </div>
                          <div className="text-xs opacity-70">{option.desc}</div>
                          {settings.privacy === option.value && (
                            <div className="text-xs text-blue-300 mt-1 font-medium">✓ Active</div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Privacy explanation */}
                    <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-xs text-gray-300">
                        Current setting: {getPrivacyDescription(settings.privacy)}
                      </div>
                    </div>
                  </div>

                  {/* Notifications - Enhanced Switch */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20">
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm">Push Notifications</h3>
                      <p className="text-gray-300 text-xs mt-1">Get notified about messages</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                        settings.notifications ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                          settings.notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Email Updates - Enhanced Switch */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20">
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm">Email Updates</h3>
                      <p className="text-gray-300 text-xs mt-1">Receive updates via email</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, emailUpdates: !settings.emailUpdates })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                        settings.emailUpdates ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                          settings.emailUpdates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Save Settings Button - Enhanced */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-center pt-4"
            >
              <button
                onClick={handleSaveSettings}
                disabled={saving || connectionState !== 'connected'}
                className="relative overflow-hidden group bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-xl hover:shadow-blue-500/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-blue-900"
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                
                {/* Button content */}
                {saving ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="h-4 w-4" />
                    <span>Save Settings</span>
                  </div>
                )}
              </button>
            </motion.div>

            {/* Danger Zone - Enhanced Glass Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="relative overflow-hidden rounded-2xl border border-red-500/30"
            >
              {/* Card Background with inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-white/5 to-pink-500/20 backdrop-blur-xl"></div>
              <div className="absolute inset-0 bg-black/20 backdrop-blur-xl"></div>
              
              {/* Card Content */}
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-red-500/30 backdrop-blur-sm">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-300" />
                  </div>
                  <span className="bg-gradient-to-r from-red-200 to-pink-200 bg-clip-text text-transparent">
                    Danger Zone
                  </span>
                </h2>
                
                <div className="bg-gradient-to-br from-red-900/20 to-pink-900/20 backdrop-blur-md border border-red-500/20 rounded-xl p-5 shadow-inner shadow-red-500/5">
                  <h3 className="text-red-300 font-semibold text-sm mb-2">Delete Account</h3>
                  <p className="text-red-200/80 mb-4 text-xs leading-relaxed">
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="relative overflow-hidden group bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm shadow-lg hover:shadow-red-500/30 hover:scale-[1.02]"
                    >
                      {/* Animated background effect */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                      
                      <TrashIcon className="h-4 w-4" />
                      <span>Delete Account</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-red-900/20 backdrop-blur-md border border-red-500/30 rounded-xl p-4">
                        <h4 className="text-red-200 font-semibold mb-2 text-sm">⚠️ Final Confirmation</h4>
                        <p className="text-red-300/90 text-xs mb-3">
                          Enter your password to delete your account:
                        </p>
                        
                        <div className="relative mb-3">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-3 py-2 pr-8 rounded-lg bg-white/10 border border-red-500/30 text-white placeholder-red-300/70 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm transition-all duration-300 backdrop-blur-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-300/70 hover:text-white transition-colors"
                          >
                            {showPassword ? (
                              <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={!deletePassword || deleting}
                            className="relative overflow-hidden group bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm shadow-lg hover:shadow-red-500/30"
                          >
                            {/* Animated background effect */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                            
                            {deleting ? (
                              <>
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <TrashIcon className="h-3 w-3" />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setDeletePassword("")
                              setDeleteStep(1)
                            }}
                            className="bg-gray-600/50 hover:bg-gray-500/50 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 text-sm backdrop-blur-sm"
                          >
                            <XMarkIcon className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Custom animations */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes gradient-slow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 15s ease infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-pulse-slow {
          animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        
        @keyframes ellipsis {
          0% { content: '.'; }
          33% { content: '..'; }
          66% { content: '...'; }
        }
        
        .animate-ellipsis::after {
          content: '...';
          animation: ellipsis 1.5s infinite;
        }
      `}</style>
    </div>
  )
}

export default Settings
