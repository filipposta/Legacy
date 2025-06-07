import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { 
  HomeIcon, 
  UserIcon, 
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface UserProfile {
  username: string
  displayName: string
  profilePic?: string
  role?: string
}

const Navbar = () => {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile)
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="text-white text-xl font-bold">ScySocial</div>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-white/20 h-8 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) {
    return (
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-white text-xl font-bold hover:text-cyan-400 transition-colors">
                ScySocial
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/dashboard" className="text-white text-xl font-bold hover:text-cyan-400 transition-colors">
              ScySocial
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/dashboard"
              className="flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <HomeIcon className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/profile"
              className="flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </Link>
            
            <Link
              to="/posts"
              className="flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4" />
              <span>Posts</span>
            </Link>

            <Link
              to="/settings"
              className="flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <CogIcon className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <Link to="/profile" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  {userProfile?.profilePic ? (
                    <img
                      src={userProfile.profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white font-semibold text-xs">
                      {getInitials(userProfile?.displayName || userProfile?.username || "U")}
                    </span>
                  )}
                </div>
                <span className="text-white text-sm font-medium">
                  {userProfile?.displayName || userProfile?.username || 'User'}
                </span>
              </Link>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-white hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-3">
            <Link to="/profile" className="flex items-center">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                {userProfile?.profilePic ? (
                  <img
                    src={userProfile.profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-white font-semibold text-xs">
                    {getInitials(userProfile?.displayName || userProfile?.username || "U")}
                  </span>
                )}
              </div>
            </Link>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-cyan-400 p-2 rounded-md transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/10 backdrop-blur-lg rounded-b-lg border-t border-white/20">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors"
              >
                <HomeIcon className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors"
              >
                <UserIcon className="h-5 w-5" />
                <span>Profile</span>
              </Link>
              
              <Link
                to="/posts"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                <span>Posts</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors"
              >
                <CogIcon className="h-5 w-5" />
                <span>Settings</span>
              </Link>

              {/* Mobile user info */}
              <div className="border-t border-white/20 pt-3">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    {userProfile?.profilePic ? (
                      <img
                        src={userProfile.profilePic}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {getInitials(userProfile?.displayName || userProfile?.username || "U")}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {userProfile?.displayName || userProfile?.username || 'User'}
                    </div>
                    <div className="text-gray-300 text-sm">
                      @{userProfile?.username || 'user'}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-3 rounded-md text-base font-medium transition-colors w-full"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar