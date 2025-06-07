import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { monitorFirestoreConnection, testFirebaseConnection } from './firebase'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import ViewProfile from './pages/ViewProfile'
import Settings from './pages/Settings'
import Posts from './pages/Posts'
import Chat from './chat/ChatList'
import ChatRoom from './chat/ChatRoom'
import MiniChat from './chat/MiniChat'
import ProfileViews from './pages/ProfileViews'
import PrivateRoute from './components/PrivateRoute'
import { ChatProvider } from './chat/ChatContext'
import './App.css'

function App() {
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  // Initialize connection monitoring and test Firebase
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Test Firebase connection first
        await testFirebaseConnection()
        setFirebaseReady(true)

        // Start monitoring if connection is good
        const cleanup = monitorFirestoreConnection()
        return cleanup
      } catch (error: any) {
        console.error('Firebase initialization failed:', error)
        setFirebaseError(error.message || 'Firebase connection failed')
      }
    }

    const cleanup = initializeFirebase()
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then((fn) => fn && fn())
      } else if (cleanup) {
        cleanup()
      }
    }
  }, [])

  // Show Firebase error screen
  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-red-500/30 p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-6xl mb-4">🔥</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Firebase Connection Error
          </h1>
          <p className="text-red-200 mb-6">{firebaseError}</p>
          <div className="space-y-3 text-sm text-red-100">
            <p>This might be due to:</p>
            <ul className="text-left space-y-1">
              <li>• Invalid or expired API key</li>
              <li>• Network connectivity issues</li>
              <li>• Firebase project configuration changes</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Show loading screen while Firebase initializes
  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Connecting to Firebase...</div>
        </div>
      </div>
    )
  }

  return (
    <ChatProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/user/:username"
              element={
                <PrivateRoute>
                  <UserProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/view/:username"
              element={
                <PrivateRoute>
                  <ViewProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/posts"
              element={
                <PrivateRoute>
                  <Posts />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat/:chatId"
              element={
                <PrivateRoute>
                  <ChatRoom />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile-views"
              element={
                <PrivateRoute>
                  <ProfileViews />
                </PrivateRoute>
              }
            />
            {/* Better path configuration for user profiles */}
            {/* This will match /profile/username */}
            {/* And the :id parameter will not be undefined */}
            <Route path="/profile/:id" element={<UserProfile />} />
            {/* Add a catch-all for the profile without an ID that redirects */}
            <Route path="/profile" element={<Navigate to="/posts" replace />} />
          </Routes>
          <MiniChat />
        </div>
      </Router>
    </ChatProvider>
  )
}

export default App
