import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { auth, db } from "../firebase"
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import {
  UserIcon,
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  LinkIcon,
  ShieldCheckIcon,
  StarIcon as StarIconOutline
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface UserData {
  id: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  backgroundUrl: string
  role?: string
  friends?: string[]
  location?: string
  website?: string
  joinedAt?: any
  nationality?: string
  age?: number
  isAdult?: boolean
  birthDate?: any
  privacy?: 'public' | 'friends' | 'private'
}

function ViewProfile() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  // Get initials helper
  const getInitials = (name: string): string => {
    if (!name) return "U"
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Get role badge
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "founder":
        return (
          <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
            <StarIconSolid className="h-3 w-3" />
            <span>FOUNDER</span>
          </div>
        )
      case "admin":
        return (
          <div className="flex items-center space-x-1 bg-gradient-to-r from-red-500 to-red-500 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
            <span>ADMIN</span>
          </div>
        )
      case "moderator":
        return (
          <div className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
            <span>MOD</span>
          </div>
        )
      case "vip":
        return (
          <div className="flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
            <span>VIP</span>
          </div>
        )
      default:
        return null
    }
  }

  // Get nationality flag
  const getNationalityFlag = (nationality?: string): string => {
    if (!nationality) return ""
    
    const nationalityFlags: { [key: string]: string } = {
      'us': '🇺🇸', 'gb': '🇬🇧', 'ca': '🇨🇦',
      'au': '🇦🇺', 'de': '🇩🇪', 'fr': '🇫🇷',
      'jp': '🇯🇵', 'kr': '🇰🇷', 'cn': '🇨🇳',
      'in': '🇮🇳', 'br': '🇧🇷'
    }
    
    return nationalityFlags[nationality.toLowerCase()] || ""
  }

  // Record profile view
  const recordProfileView = async (profileId: string) => {
    if (!currentUser || currentUser.uid === profileId) return
    
    try {
      await addDoc(collection(db, "profileViews"), {
        profileId: profileId,
        viewerId: currentUser.uid,
        timestamp: serverTimestamp(),
        viewedAt: new Date()
      })
      console.log("Profile view recorded successfully")
    } catch (error) {
      console.error("Error recording profile view:", error)
    }
  }

  // Load user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!username) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Find user by username
        const usersRef = collection(db, "users")
        const snapshot = await getDocs(usersRef)
        
        let userDoc = null
        for (const doc of snapshot.docs) {
          const data = doc.data()
          if (data.username === username) {
            userDoc = { id: doc.id, ...data }
            break
          }
        }

        if (!userDoc) {
          setNotFound(true)
          setLoading(false)
          return
        }

        // Check privacy settings
        const profilePrivacy = userDoc.privacy || 'public'
        
        if (profilePrivacy === 'private') {
          if (!currentUser || currentUser.uid !== userDoc.id) {
            setAccessDenied(true)
            setLoading(false)
            return
          }
        } else if (profilePrivacy === 'friends') {
          if (!currentUser || currentUser.uid !== userDoc.id) {
            // Check if users are friends
            const currentUserDoc = await getDoc(doc(db, "users", currentUser?.uid || ""))
            if (currentUserDoc.exists()) {
              const currentUserData = currentUserDoc.data()
              const currentUserFriends = currentUserData.friends || []
              const profileUserFriends = userDoc.friends || []
              
              const isFriend = currentUserFriends.includes(userDoc.id) || 
                              profileUserFriends.includes(currentUser?.uid)
              
              if (!isFriend) {
                setAccessDenied(true)
                setLoading(false)
                return
              }
            } else {
              setAccessDenied(true)
              setLoading(false)
              return
            }
          }
        }

        setUserData(userDoc as UserData)
        
        // Record profile view if not own profile
        if (currentUser && currentUser.uid !== userDoc.id) {
          await recordProfileView(userDoc.id)
        }
        
      } catch (error) {
        console.error("Error fetching user profile:", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [username, currentUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-300 mb-6">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/posts')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Posts
          </button>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <ShieldCheckIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-6">This profile is private or restricted to friends only.</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => navigate('/posts')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Posts
            </button>
            {!currentUser && (
              <button
                onClick={() => navigate('/login')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* Profile Header */}
        <div className="relative">
          {/* Background Image */}
          {userData.backgroundUrl && (
            <div className="h-64 bg-cover bg-center rounded-t-2xl" 
                 style={{ backgroundImage: `url(${userData.backgroundUrl})` }}>
              <div className="h-full bg-black/50 rounded-t-2xl"></div>
            </div>
          )}
          
          {/* Profile Content */}
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8 ${userData.backgroundUrl ? '-mt-32 relative z-10' : ''}`}>
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  {userData.profilePic ? (
                    <img
                      src={userData.profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-3xl font-bold">
                      {getInitials(userData.displayName || userData.username)}
                    </span>
                  )}
                </div>
                {userData.isAdult && (
                  <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg">
                    18+
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4">
                  <h1 className="text-3xl font-bold text-white">
                    {userData.displayName || userData.username}
                  </h1>
                  {getRoleBadge(userData.role)}
                  {userData.isAdult && (
                    <div className="flex items-center space-x-1 bg-red-600 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                      <ShieldCheckIcon className="h-3 w-3" />
                      <span>18+</span>
                    </div>
                  )}
                </div>

                <p className="text-gray-300 text-lg mb-4">@{userData.username}</p>

                {userData.bio && (
                  <p className="text-gray-200 mb-6 max-w-2xl">{userData.bio}</p>
                )}

                {/* User Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {userData.location && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{userData.location}</span>
                    </div>
                  )}
                  
                  {userData.website && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <LinkIcon className="h-4 w-4" />
                      <a 
                        href={userData.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {userData.website}
                      </a>
                    </div>
                  )}
                  
                  {userData.joinedAt && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Joined {new Date(userData.joinedAt.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {userData.nationality && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <span className="text-xl">{getNationalityFlag(userData.nationality)}</span>
                      <span>{userData.nationality.toUpperCase()}</span>
                    </div>
                  )}
                  
                  {userData.age && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <span>{userData.age} years old</span>
                    </div>
                  )}
                </div>

                {/* Friends Count */}
                <div className="mt-6 flex justify-center md:justify-start">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <span className="text-white font-medium">
                      {userData.friends?.length || 0} Friends
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => navigate(`/user/${userData.username}`)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg"
          >
            View Full Profile
          </button>
          
          <button
            onClick={() => navigate('/posts')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Back to Posts
          </button>
        </div>
      </div>
    </div>
  )
}

export default ViewProfile
