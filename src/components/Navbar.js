import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeSignOut, registerSignOutCleanup, setupWebChannelErrorSuppression } from "../utils/AuthCleanup";
import { HomeIcon, UserIcon, ArrowRightOnRectangleIcon, CogIcon, Bars3Icon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
function Navbar() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const [isAuthChanging, setIsAuthChanging] = useState(false);
    // Add state to keep fixed auth status to avoid flashing login/logout UI
    const [authStatus, setAuthStatus] = useState('loading');
    const [stableAuthState, setStableAuthState] = useState(() => {
        // Initialize from localStorage/sessionStorage on component mount
        return localStorage.getItem('userAuthenticated') === 'true' ||
            sessionStorage.getItem('authStatus') === 'authenticated';
    });
    const navigate = useNavigate();
    // Set up WebChannel error suppression on component mount
    useEffect(() => {
        const cleanupErrorSuppression = setupWebChannelErrorSuppression();
        return () => {
            cleanupErrorSuppression();
        };
    }, []);
    useEffect(() => {
        let isMounted = true;
        let unsubscribe = null;
        // Initialize auth state from storage immediately
        const initialAuthState = localStorage.getItem('userAuthenticated') === 'true';
        if (initialAuthState) {
            setStableAuthState(true);
            setAuthStatus('authenticated');
        }
        const setupAuthListener = async () => {
            try {
                // Before auth state changes, store the current auth in sessionStorage
                // This helps maintain consistent UI across page transitions
                const currentAuthStatus = sessionStorage.getItem('authStatus');
                if (currentAuthStatus === 'authenticated') {
                    setAuthStatus('authenticated');
                    setStableAuthState(true);
                }
                unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
                    if (!isMounted)
                        return;
                    setIsAuthChanging(true);
                    if (currentUser) {
                        setUser(currentUser);
                        // Set auth status in both state and storage to persist across navigations
                        setAuthStatus('authenticated');
                        setStableAuthState(true);
                        sessionStorage.setItem('authStatus', 'authenticated');
                        localStorage.setItem('userAuthenticated', 'true');
                        try {
                            // Enhanced error handling with better WebChannel error detection
                            const loadUserProfile = async (retries = 2) => {
                                for (let attempt = 1; attempt <= retries; attempt++) {
                                    try {
                                        // Shorter timeout for faster fallback
                                        const userDocPromise = getDoc(doc(db, "users", currentUser.uid));
                                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000));
                                        const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
                                        // Clear connection error on success
                                        setConnectionError(false);
                                        return userDoc;
                                    }
                                    catch (error) {
                                        console.warn(`Profile load attempt ${attempt}/${retries} failed:`, error.message);
                                        // Handle permission errors immediately - don't retry
                                        if (error.code === 'permission-denied' ||
                                            error.message?.includes('Missing or insufficient permissions')) {
                                            console.warn('Firestore permissions denied - using auth fallback immediately');
                                            throw new Error('PERMISSION_DENIED');
                                        }
                                        // Handle WebChannel and connection errors
                                        if (error.code === 'unavailable' ||
                                            error.code === 'deadline-exceeded' ||
                                            error.message?.includes('WebChannelConnection') ||
                                            error.message?.includes('Bad Request') ||
                                            error.message?.includes('transport errored') ||
                                            error.message?.includes('Failed to load resource') ||
                                            error.name === 'FirebaseError') {
                                            setConnectionError(true);
                                            if (attempt < retries) {
                                                // Shorter wait time for faster user experience
                                                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                                                continue;
                                            }
                                            else {
                                                // Final attempt failed - use fallback immediately
                                                throw new Error('FIRESTORE_UNAVAILABLE');
                                            }
                                        }
                                        // For other errors or final attempt, throw
                                        throw error;
                                    }
                                }
                            };
                            try {
                                const userDoc = await loadUserProfile();
                                if (userDoc.exists() && isMounted) {
                                    const userData = userDoc.data();
                                    setUserProfile({
                                        id: currentUser.uid,
                                        username: userData.username || currentUser.email?.split('@')[0] || 'User',
                                        displayName: userData.displayName || userData.username || currentUser.email?.split('@')[0] || 'User',
                                        profilePic: userData.profileImage || userData.profilePic || '',
                                        role: userData.role || 'user',
                                        backgroundUrl: userData.backgroundImage || userData.backgroundUrl || ''
                                    });
                                }
                                else if (isMounted) {
                                    // Fallback user data if document doesn't exist
                                    setUserProfile({
                                        id: currentUser.uid,
                                        username: currentUser.email?.split('@')[0] || 'User',
                                        displayName: currentUser.email?.split('@')[0] || 'User',
                                        profilePic: '',
                                        role: 'user',
                                        backgroundUrl: ''
                                    });
                                }
                            }
                            catch (profileError) {
                                // Enhanced error handling with better user feedback
                                if (profileError.message === 'PERMISSION_DENIED' ||
                                    profileError.code === 'permission-denied') {
                                    console.warn('Firestore access denied - using enhanced auth fallback');
                                }
                                else if (profileError.message === 'FIRESTORE_UNAVAILABLE') {
                                    console.warn('Firestore service unavailable - using auth fallback');
                                    setConnectionError(true);
                                }
                                if (isMounted) {
                                    // Enhanced fallback with better data extraction
                                    setUserProfile({
                                        id: currentUser.uid,
                                        username: currentUser.email?.split('@')[0] ||
                                            currentUser.displayName?.toLowerCase().replace(/\s+/g, '') ||
                                            'User',
                                        displayName: currentUser.displayName ||
                                            currentUser.email?.split('@')[0] ||
                                            'User',
                                        profilePic: currentUser.photoURL || '',
                                        role: 'user',
                                        backgroundUrl: ''
                                    });
                                }
                            }
                        }
                        catch (error) {
                            console.warn("Error loading user data, using fallback:", error);
                            setConnectionError(true);
                            // Enhanced fallback handling
                            if (isMounted) {
                                const fallbackProfile = {
                                    id: currentUser.uid,
                                    username: currentUser.email?.split('@')[0] || 'User',
                                    displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                                    profilePic: currentUser.photoURL || '',
                                    role: 'user',
                                    backgroundUrl: ''
                                };
                                setUserProfile(fallbackProfile);
                            }
                        }
                    }
                    else {
                        // Only change auth state if we're sure the user is logged out
                        // and not just experiencing a temporary auth state fluctuation
                        const wasAuthenticated = localStorage.getItem('userAuthenticated') === 'true';
                        if (wasAuthenticated) {
                            // This might be a temporary auth state change or page refresh
                            console.log('Auth state changed but keeping stable state temporarily');
                            // Wait briefly to see if auth reestablishes
                            setTimeout(() => {
                                // If after timeout we still have no user, consider it a true logout
                                if (!auth.currentUser) {
                                    setUser(null);
                                    setUserProfile(null);
                                    setConnectionError(false);
                                    setAuthStatus('unauthenticated');
                                    setStableAuthState(false);
                                    localStorage.removeItem('userAuthenticated');
                                    sessionStorage.removeItem('authStatus');
                                }
                            }, 300);
                        }
                        else {
                            // User was definitely not authenticated, update immediately
                            setUser(null);
                            setUserProfile(null);
                            setConnectionError(false);
                            setAuthStatus('unauthenticated');
                            setStableAuthState(false);
                            localStorage.removeItem('userAuthenticated');
                            sessionStorage.removeItem('authStatus');
                        }
                    }
                    if (isMounted) {
                        setLoading(false);
                        // Add a short delay before removing transition state
                        setTimeout(() => setIsAuthChanging(false), 150);
                    }
                }, (authError) => {
                    console.error("Auth state change error:", authError);
                    if (isMounted) {
                        setLoading(false);
                        setUser(null);
                        setUserProfile(null);
                        setAuthStatus('unauthenticated');
                        setStableAuthState(false);
                        localStorage.removeItem('userAuthenticated');
                        sessionStorage.removeItem('authStatus');
                    }
                });
            }
            catch (error) {
                console.error("Error setting up auth listener:", error);
                if (isMounted) {
                    setLoading(false);
                    setConnectionError(true);
                    setAuthStatus('unauthenticated');
                    setStableAuthState(false);
                    localStorage.removeItem('userAuthenticated');
                    sessionStorage.removeItem('authStatus');
                }
            }
        };
        // Register a sign-out listener to clean up before auth state changes
        const unregisterSignOutCleanup = registerSignOutCleanup(() => {
            // Clean up any Firebase listeners here
            if (unsubscribe) {
                try {
                    unsubscribe();
                    unsubscribe = null;
                }
                catch (e) {
                    // Silent error handling
                }
            }
        });
        setupAuthListener();
        return () => {
            isMounted = false;
            unregisterSignOutCleanup();
            if (unsubscribe) {
                try {
                    unsubscribe();
                }
                catch (error) {
                    console.warn("Error during cleanup:", error);
                }
            }
        };
    }, []);
    const handleSignOut = async () => {
        try {
            // First update all auth indicators immediately to prevent UI flashing
            setAuthStatus('unauthenticated');
            setStableAuthState(false);
            localStorage.removeItem('userAuthenticated');
            sessionStorage.removeItem('authStatus');
            // Then set user to null to prevent any new Firebase requests
            setUser(null);
            setUserProfile(null);
            // Use enhanced sign out
            const success = await safeSignOut();
            if (success) {
                // Use direct navigation for more reliable route change
                window.location.href = '/login';
            }
        }
        catch (error) {
            console.error('Error signing out:', error);
        }
    };
    // Modify the Quick Logout function to provide better visual feedback and replace the regular logout
    const handleQuickLogout = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            // Show visual feedback
            const target = e.currentTarget;
            target.classList.add('bg-red-600');
            target.setAttribute('disabled', 'true');
            // First, set user to null to prevent any new Firebase requests
            setUser(null);
            setUserProfile(null);
            // Use enhanced sign out with minimal delay
            await safeSignOut();
            // Navigate immediately without waiting
            navigate('/login');
        }
        catch (error) {
            console.error('Quick logout failed:', error);
        }
    };
    const getInitials = (name) => {
        if (!name)
            return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    // Common navbar layout for loading and transition states
    const renderLoadingNavbar = () => (_jsx("nav", { className: "bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx("img", { src: "/logo.png", alt: "ScySocial", className: "h-16 w-auto" }) }), _jsx("div", { className: "flex items-center", children: _jsx("div", { className: "animate-pulse bg-white/20 h-8 w-20 rounded" }) })] }) }) }));
    // For consistent UI across navigations and reloads
    const shouldShowAuthenticatedUI = stableAuthState || user !== null || authStatus === 'authenticated';
    const shouldShowLoginUI = !shouldShowAuthenticatedUI && authStatus === 'unauthenticated';
    // Show loading state while auth is initializing
    if (loading && !shouldShowAuthenticatedUI && !shouldShowLoginUI) {
        return renderLoadingNavbar();
    }
    // Only show sign in/sign up buttons if user is definitely not logged in
    if (shouldShowLoginUI) {
        return (_jsx("nav", { className: "bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx("a", { href: "/", className: "hover:text-cyan-400 transition-colors", children: _jsx("img", { src: "/logo.png", alt: "ScySocial", className: "h-16 w-auto" }) }) }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("a", { href: "/login", className: "text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", onClick: (e) => {
                                        e.preventDefault();
                                        window.location.href = "/login";
                                    }, children: "Sign In" }), _jsx("a", { href: "/register", className: "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors", onClick: (e) => {
                                        e.preventDefault();
                                        window.location.href = "/register";
                                    }, children: "Sign Up" })] })] }) }) }));
    }
    // Main navbar for logged in users
    return (_jsxs("nav", { className: "bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50", children: [connectionError && (_jsx("div", { className: "bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-1", children: _jsx("div", { className: "max-w-7xl mx-auto", children: _jsx("p", { className: "text-yellow-200 text-xs text-center", children: "Limited connectivity - some features may be unavailable" }) }) })), _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "flex justify-between h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx(Link, { to: "/posts", className: "hover:text-cyan-400 transition-colors", children: _jsx("img", { src: "/logo.png", alt: "ScySocial", className: "h-16 w-auto" }) }) }), _jsxs("div", { className: "hidden md:flex items-center space-x-6", children: [_jsxs(Link, { to: "/posts", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(HomeIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Home" })] }), _jsxs(Link, { to: "/profile", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(UserIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Profile" })] }), _jsxs(Link, { to: "/profile-views", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(EyeIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Profile Views" })] }), _jsxs(Link, { to: "/settings", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(CogIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Settings" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs(Link, { to: "/profile", className: "flex items-center space-x-2 hover:opacity-80 transition-opacity", children: [_jsx("div", { className: "w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover rounded-full" })) : (_jsx("span", { className: "text-white font-semibold text-xs", children: getInitials(userProfile?.displayName || userProfile?.username || "U") })) }), _jsx("span", { className: "text-white text-sm font-medium", children: userProfile?.displayName || userProfile?.username || 'User' })] }), _jsxs("button", { onClick: handleSignOut, className: "flex items-center space-x-1 text-white hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(ArrowRightOnRectangleIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Sign Out" })] })] })] }), _jsxs("div", { className: "md:hidden flex items-center space-x-3", children: [_jsx(Link, { to: "/profile", className: "flex items-center", children: _jsx("div", { className: "w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover rounded-full" })) : (_jsx("span", { className: "text-white font-semibold text-xs", children: getInitials(userProfile?.displayName || userProfile?.username || "U") })) }) }), _jsx("button", { onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: "text-white hover:text-cyan-400 p-2 rounded-md transition-colors", children: mobileMenuOpen ? (_jsx(XMarkIcon, { className: "h-6 w-6" })) : (_jsx(Bars3Icon, { className: "h-6 w-6" })) })] })] }), mobileMenuOpen && (_jsx("div", { className: "md:hidden", children: _jsxs("div", { className: "px-2 pt-2 pb-3 space-y-1 bg-white/10 backdrop-blur-lg rounded-b-lg border-t border-white/20", children: [_jsxs(Link, { to: "/posts", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(HomeIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Home" })] }), _jsxs(Link, { to: "/profile", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(UserIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Profile" })] }), _jsxs(Link, { to: "/profile-views", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(EyeIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Profile Views" })] }), _jsxs(Link, { to: "/settings", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(CogIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Settings" })] }), _jsxs("div", { className: "border-t border-white/20 pt-3", children: [_jsxs("div", { className: "flex items-center space-x-3 px-3 py-2", children: [_jsx("div", { className: "w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover rounded-full" })) : (_jsx("span", { className: "text-white font-semibold text-sm", children: getInitials(userProfile?.displayName || userProfile?.username || "U") })) }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-white font-medium", children: userProfile?.displayName || userProfile?.username || 'User' }), _jsxs("div", { className: "text-gray-300 text-sm", children: ["@", userProfile?.username || 'user'] })] })] }), _jsx("div", { className: "flex space-x-2", children: _jsxs("button", { onClick: () => {
                                                    handleSignOut();
                                                    setMobileMenuOpen(false);
                                                }, className: "flex-1 flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(ArrowRightOnRectangleIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Sign Out" })] }) })] })] }) }))] })] }));
}
export default Navbar;
