import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { monitorFirestoreConnection, testFirebaseConnection } from './firebase';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import ViewProfile from './pages/ViewProfile';
import Settings from './pages/Settings';
import Posts from './pages/Posts';
import Chat from './chat/ChatList';
import ChatRoom from './chat/ChatRoom';
import MiniChat from './chat/MiniChat';
import ProfileViews from './pages/ProfileViews';
import PrivateRoute from './components/PrivateRoute';
import { ChatProvider } from './chat/ChatContext';
import './App.css';
function App() {
    const [firebaseError, setFirebaseError] = useState(null);
    const [firebaseReady, setFirebaseReady] = useState(false);
    // Initialize connection monitoring and test Firebase
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Test Firebase connection first
                await testFirebaseConnection();
                setFirebaseReady(true);
                // Start monitoring if connection is good
                const cleanup = monitorFirestoreConnection();
                return cleanup;
            }
            catch (error) {
                console.error('Firebase initialization failed:', error);
                setFirebaseError(error.message || 'Firebase connection failed');
            }
        };
        const cleanup = initializeFirebase();
        return () => {
            if (cleanup instanceof Promise) {
                cleanup.then((fn) => fn && fn());
            }
            else if (cleanup) {
                cleanup();
            }
        };
    }, []);
    // Show Firebase error screen
    if (firebaseError) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white/10 backdrop-blur-md rounded-2xl border border-red-500/30 p-8 max-w-md w-full text-center", children: [_jsx("div", { className: "text-red-400 text-6xl mb-4", children: "\uD83D\uDD25" }), _jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Firebase Connection Error" }), _jsx("p", { className: "text-red-200 mb-6", children: firebaseError }), _jsxs("div", { className: "space-y-3 text-sm text-red-100", children: [_jsx("p", { children: "This might be due to:" }), _jsxs("ul", { className: "text-left space-y-1", children: [_jsx("li", { children: "\u2022 Invalid or expired API key" }), _jsx("li", { children: "\u2022 Network connectivity issues" }), _jsx("li", { children: "\u2022 Firebase project configuration changes" })] })] }), _jsx("button", { onClick: () => window.location.reload(), className: "mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors", children: "Retry Connection" })] }) }));
    }
    // Show loading screen while Firebase initializes
    if (!firebaseReady) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" }), _jsx("div", { className: "text-white text-xl", children: "Connecting to Firebase..." })] }) }));
    }
    return (_jsx(ChatProvider, { children: _jsx(Router, { children: _jsxs("div", { className: "min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900", children: [_jsx(Navbar, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/", element: _jsx(PrivateRoute, { children: _jsx(Home, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(PrivateRoute, { children: _jsx(Profile, {}) }) }), _jsx(Route, { path: "/user/:username", element: _jsx(PrivateRoute, { children: _jsx(UserProfile, {}) }) }), _jsx(Route, { path: "/view/:username", element: _jsx(PrivateRoute, { children: _jsx(ViewProfile, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(PrivateRoute, { children: _jsx(Settings, {}) }) }), _jsx(Route, { path: "/posts", element: _jsx(PrivateRoute, { children: _jsx(Posts, {}) }) }), _jsx(Route, { path: "/chat", element: _jsx(PrivateRoute, { children: _jsx(Chat, {}) }) }), _jsx(Route, { path: "/chat/:chatId", element: _jsx(PrivateRoute, { children: _jsx(ChatRoom, {}) }) }), _jsx(Route, { path: "/profile-views", element: _jsx(PrivateRoute, { children: _jsx(ProfileViews, {}) }) }), _jsx(Route, { path: "/profile/:id", element: _jsx(UserProfile, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Navigate, { to: "/posts", replace: true }) })] }), _jsx(MiniChat, {})] }) }) }));
}
export default App;
