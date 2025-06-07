import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CalendarIcon, GlobeAltIcon, ShieldCheckIcon, MapPinIcon, LinkIcon, HeartIcon, ShareIcon, NewspaperIcon, } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
function UserProfile() {
    const { id } = useParams(); // This is actually the username or user ID
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [deletingProfile, setDeletingProfile] = useState(false);
    const [userId, setUserId] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [showAdultWarning, setShowAdultWarning] = useState(false);
    const [permissionError, setPermissionError] = useState(false);
    const [reducedMode, setReducedMode] = useState(false);
    const [noListeners, setNoListeners] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const [showNews, setShowNews] = useState(false);
    const [newsPosts, setNewsPosts] = useState([]);
    const [debugInfo, setDebugInfo] = useState('Initializing...');
    const [connectionErrors, setConnectionErrors] = useState([]);
    const [retryCount, setRetryCount] = useState(0);
    const [offlineMode, setOfflineMode] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [activeListeners, setActiveListeners] = useState([]);
    const maxRetries = 3;
    // Search for news posts
    const searchForNews = () => {
        if (!posts || posts.length === 0) {
            setNewsPosts([]);
            return;
        }
        try {
            const newsKeywords = ['news', 'report', 'update', 'breaking', 'today', 'announced', 'official', 'launch'];
            const newsContent = posts.filter(post => {
                const content = post.content?.toLowerCase() || '';
                return newsKeywords.some(keyword => content.includes(keyword.toLowerCase()));
            });
            setNewsPosts(newsContent);
        }
        catch (error) {
            console.error('Error searching for news:', error);
            setNewsPosts([]);
        }
    };
    // Function to clean up all Firestore listeners
    const cleanupAllFirestoreListeners = () => {
        activeListeners.forEach(unsubscribe => {
            try {
                unsubscribe();
            }
            catch (e) {
                // Silent handling of cleanup errors
            }
        });
        setActiveListeners([]);
    };
    // Auth state listener
    useEffect(() => {
        let isMounted = true;
        // This function will store and track all active listeners
        const registerListener = (unsubscribeFn) => {
            setActiveListeners(prev => [...prev, unsubscribeFn]);
            return unsubscribeFn;
        };
        // Register the auth listener properly
        const unsubscribeAuth = registerListener(onAuthStateChanged(auth, async (user) => {
            if (!isMounted)
                return;
            // If user logs out, immediately clean up all Firestore listeners
            if (!user && currentUser) {
                logDebug('User logged out, cleaning up all listeners');
                cleanupAllFirestoreListeners();
            }
            setCurrentUser(user);
            if (user) {
                try {
                    setDebugInfo('Fetching current user data...');
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && isMounted) {
                        setCurrentUserData({ id: user.uid, ...userDoc.data() });
                        setDebugInfo('Current user data loaded');
                    }
                    else {
                        setCurrentUserData(null);
                        setDebugInfo('No current user data found');
                    }
                }
                catch (error) {
                    console.error("Error fetching current user data:", error);
                    setDebugInfo('Failed to load current user data');
                    if (error?.code === 'permission-denied') {
                        setReducedMode(true);
                        setNoListeners(true);
                        setPermissionError(true);
                    }
                }
            }
            else {
                setCurrentUserData(null);
            }
        }, (error) => {
            console.error("Auth state error:", error);
            setDebugInfo('Auth error: ' + error.message);
            if (isMounted) {
                setPermissionError(true);
                setReducedMode(true);
                setNoListeners(true);
                setLoading(false);
            }
        }));
        return () => {
            isMounted = false;
            // Clean up auth listener
            unsubscribeAuth();
            // Clean up all remaining Firestore listeners
            cleanupAllFirestoreListeners();
        };
    }, []);
    // Time formatting utility
    const timeAgo = (timestamp) => {
        if (!timestamp)
            return 'Just now';
        try {
            const date = timestamp?.toDate ? timestamp.toDate() :
                timestamp instanceof Date ? timestamp :
                    new Date(timestamp);
            if (isNaN(date.getTime()))
                return 'Just now';
            const now = new Date();
            const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
            if (diffInMinutes < 1)
                return 'Just now';
            if (diffInMinutes < 60)
                return `${diffInMinutes}m ago`;
            if (diffInMinutes < 1440)
                return `${Math.floor(diffInMinutes / 60)}h ago`;
            return `${Math.floor(diffInMinutes / 1440)}d ago`;
        }
        catch (error) {
            console.error("Error formatting time:", error);
            return 'Just now';
        }
    };
    // Sort posts by date
    const sortPosts = (posts) => {
        if (!Array.isArray(posts) || posts.length === 0)
            return [];
        try {
            return [...posts].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
            });
        }
        catch (error) {
            console.error("Error sorting posts:", error);
            return posts;
        }
    };
    // Handle permission error retry
    const handlePermissionError = () => {
        setPermissionError(false);
        setReducedMode(true);
        setNoListeners(true);
        setLoading(true);
        fetchUserAndPosts();
    };
    // Enhanced debug logging with connection status
    const logDebug = (message, isError = false) => {
        const timestamp = new Date().toISOString().substr(11, 8);
        const prefix = isError ? "🛑 ERROR" : "ℹ️ INFO";
        const newDebugInfo = `[${timestamp}] ${prefix}: ${message}`;
        console.log(`Debug: ${newDebugInfo}`);
        setDebugInfo(newDebugInfo);
        if (isError) {
            setConnectionErrors(prev => [...prev.slice(-4), message]);
        }
    };
    // Connection error handling
    const handleConnectionError = (error) => {
        const errorMessage = error?.message || "Unknown error";
        logDebug(`Connection error: ${errorMessage}`, true);
        if (retryCount < maxRetries) {
            logDebug(`Retry attempt ${retryCount + 1} of ${maxRetries}...`);
            setRetryCount(prev => prev + 1);
            // Progressive backoff for retries
            setTimeout(() => {
                if (currentUser !== undefined) {
                    fetchUserAndPosts();
                }
            }, 1000 * Math.pow(2, retryCount));
        }
        else {
            logDebug("Max retries reached, switching to offline mode", true);
            setOfflineMode(true);
            setReducedMode(true);
            setNoListeners(true);
        }
    };
    // Check network status
    useEffect(() => {
        const handleOnline = () => {
            logDebug("Network connection restored");
            setOfflineMode(false);
            if (retryCount >= maxRetries) {
                setRetryCount(0);
                fetchUserAndPosts();
            }
        };
        const handleOffline = () => {
            logDebug("Network connection lost", true);
            setOfflineMode(true);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [retryCount]);
    // Add Firebase connection monitoring
    useEffect(() => {
        let connectionStatusTimeout;
        // Track Firestore connection status
        const checkFirestoreConnection = async () => {
            try {
                // Try a small query to check if Firestore is accessible
                const testQuery = query(collection(db, "system"), limit(1));
                await getDocs(testQuery).then(() => {
                    if (offlineMode) {
                        logDebug("Firestore connection restored", false);
                        setOfflineMode(false);
                    }
                });
            }
            catch (error) {
                if (!offlineMode) {
                    logDebug(`Firestore connection lost: ${error.message}`, true);
                    setOfflineMode(true);
                }
            }
            finally {
                // Schedule next check
                connectionStatusTimeout = setTimeout(checkFirestoreConnection, 30000);
            }
        };
        // Start monitoring
        checkFirestoreConnection();
        // Listen for specific Firebase errors
        const handleFirebaseError = (event) => {
            const errorMessage = event.message || 'Unknown error';
            // Check if it's a Firebase error (this is an approximate check)
            if (errorMessage.includes('firebase') ||
                errorMessage.includes('firestore') ||
                (event.filename && event.filename.includes('firebase'))) {
                logDebug(`Firebase error detected: ${errorMessage}`, true);
                // If we detect multiple Firebase errors, go into offline mode
                setConnectionErrors(prev => {
                    const newErrors = [...prev, errorMessage].slice(-5);
                    if (newErrors.length >= 3) {
                        setOfflineMode(true);
                    }
                    return newErrors;
                });
            }
        };
        window.addEventListener('error', handleFirebaseError);
        return () => {
            clearTimeout(connectionStatusTimeout);
            window.removeEventListener('error', handleFirebaseError);
        };
    }, [offlineMode]);
    // Add specialized WebChannel error handler
    useEffect(() => {
        // Function to handle specific Firebase WebChannel errors (which often appear as transport errors)
        const handleWebChannelErrors = () => {
            // Create a custom error detector that runs periodically
            const detector = setInterval(() => {
                const consoleErrors = document.querySelectorAll('[data-testid="console-error-line"]');
                const errorTexts = Array.from(consoleErrors).map(el => el.textContent || '');
                // Look for Firestore WebChannel errors in the console
                const hasWebChannelErrors = errorTexts.some(text => text.includes('WebChannelConnection') ||
                    text.includes('transport errored') ||
                    text.includes('@firebase/firestore'));
                if (hasWebChannelErrors && !offlineMode) {
                    logDebug('Detected WebChannel connection errors in console', true);
                    setOfflineMode(true);
                    // When WebChannel errors are detected, go into recovery mode
                    recoveryFromWebChannelError();
                }
            }, 5000); // Check every 5 seconds
            return () => clearInterval(detector);
        };
        // Function to recover from WebChannel errors
        const recoveryFromWebChannelError = () => {
            logDebug('Attempting recovery from WebChannel error', true);
            // Use local storage data if available
            if (id || userId) {
                const profileId = id || userId || '';
                const cachedData = localStorage.getItem(`profile_${profileId}`);
                if (cachedData) {
                    try {
                        const parsedCache = JSON.parse(cachedData);
                        setUserData(parsedCache.userData);
                        setPosts(parsedCache.posts || []);
                        logDebug('Recovered profile from cache after WebChannel error', true);
                    }
                    catch (e) {
                        logDebug('Failed to parse cached profile data', true);
                    }
                }
            }
        };
        // Also listen for console errors programmatically
        const originalConsoleError = console.error;
        console.error = function (message, ...optionalParams) {
            const errorMessage = String(message);
            // Look for specific Firebase errors
            if (typeof errorMessage === 'string' &&
                (errorMessage.includes('@firebase') ||
                    errorMessage.includes('WebChannelConnection') ||
                    errorMessage.includes('Firestore'))) {
                // Handle the Firestore error
                if (!offlineMode) {
                    logDebug(`Firebase console error: ${errorMessage.substring(0, 100)}...`, true);
                    setConnectionErrors(prev => [...prev.slice(-4), errorMessage.substring(0, 100)]);
                    // If we get multiple Firebase errors, go to offline mode
                    if (connectionErrors.length >= 2) {
                        setOfflineMode(true);
                    }
                }
            }
            originalConsoleError.apply(console, [message, ...optionalParams]);
        };
        // Start the detector
        handleWebChannelErrors();
        // Clean up
        return () => {
            console.error = originalConsoleError;
        };
    }, [offlineMode, id, userId, connectionErrors.length]);
    // Enhance safeFirestoreGet with specific WebChannel error handling
    const safeFirestoreGet = async (queryPromise) => {
        if (noListeners || offlineMode) {
            console.log("Skipping Firestore operation in offline/no-listeners mode");
            return { docs: [], empty: true };
        }
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Firestore query timeout after 10 seconds')), 10000);
            });
            return await Promise.race([queryPromise, timeoutPromise]);
        }
        catch (error) {
            console.error("Firestore query error:", error);
            // Add specific detection for WebChannel errors (they often don't have proper codes)
            const errorString = String(error);
            if (errorString.includes('WebChannel') ||
                errorString.includes('transport errored') ||
                error?.message?.includes('WebChannel') ||
                error === null || error === undefined) { // WebChannel errors sometimes come as undefined
                logDebug("WebChannel connection error detected", true);
                setOfflineMode(true);
                setNoListeners(true);
                setReducedMode(true);
            }
            // Handle specific error codes
            if (error?.code === 'permission-denied') {
                setPermissionError(true);
                setReducedMode(true);
                setNoListeners(true);
            }
            else if (error?.message?.includes('timeout') ||
                error?.code === 'unavailable' ||
                error?.code === 'resource-exhausted' ||
                error?.status === 400 || // Explicitly handle 400 errors
                (typeof error?.code === 'number' && error.code >= 400) // Handle numeric HTTP error codes
            ) {
                // Handle timeout or service unavailable errors
                handleConnectionError(error);
            }
            throw error;
        }
    };
    // Record profile view
    const recordProfileView = async (profileId) => {
        if (!currentUser || currentUser.uid === profileId)
            return;
        try {
            const [currentUserDoc, profileUserDoc] = await Promise.all([
                safeFirestoreGet(getDoc(doc(db, "users", currentUser.uid))),
                safeFirestoreGet(getDoc(doc(db, "users", profileId)))
            ]);
            if (!currentUserDoc.exists() || !profileUserDoc.exists()) {
                console.log("Skipping profile view - one or both users don't exist");
                return;
            }
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentViewQuery = query(collection(db, "profileViews"), where("profileId", "==", profileId), where("viewerId", "==", currentUser.uid));
            const recentViews = await safeFirestoreGet(getDocs(recentViewQuery));
            let shouldRecord = true;
            const oldViewIds = [];
            for (const doc of recentViews.docs) {
                const data = doc.data();
                const viewTime = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || 0);
                if (viewTime > oneHourAgo) {
                    shouldRecord = false;
                }
                else {
                    oldViewIds.push(doc.id);
                }
            }
            if (oldViewIds.length > 0) {
                const deletePromises = oldViewIds.map(id => deleteDoc(doc(db, "profileViews", id)).catch(err => console.error("Error deleting old view:", err)));
                await Promise.allSettled(deletePromises);
            }
            if (!shouldRecord) {
                console.log("Profile view already recorded recently, skipping...");
                return;
            }
            const viewData = {
                profileId: profileId,
                viewerId: currentUser.uid,
                timestamp: serverTimestamp(),
                viewedAt: new Date(),
                viewerExists: true,
                profileExists: true,
                recordedAt: new Date().toISOString()
            };
            await safeFirestoreGet(addDoc(collection(db, "profileViews"), viewData));
            console.log("Profile view recorded successfully");
        }
        catch (error) {
            console.error("Error recording profile view:", error);
        }
    };
    // Fix direct URL access handling
    const useDirectProfileNavigation = () => {
        // This hook ensures proper loading even when navigating directly to profile URLs
        const location = window.location;
        const urlParams = new URLSearchParams(location.search);
        const pathSegments = location.pathname.split('/');
        const maybeProfileId = pathSegments[pathSegments.length - 1];
        useEffect(() => {
            if (maybeProfileId && !id) {
                logDebug(`Found profile ID in URL path: ${maybeProfileId}`);
                // This forces a proper refresh when directly navigating to profile URL
                window.history.replaceState({}, '', `/profile/${maybeProfileId}${location.search}`);
                window.location.reload();
            }
        }, []);
    };
    // Initialize this hook at the top of the component
    useDirectProfileNavigation();
    // Enhanced fetchUserAndPosts with manual error fallback
    const fetchUserAndPosts = async () => {
        if (!id) {
            logDebug('No user ID provided - attempting to extract from URL');
            const pathSegments = window.location.pathname.split('/');
            const maybeProfileId = pathSegments[pathSegments.length - 1];
            if (maybeProfileId && maybeProfileId !== 'profile') {
                logDebug(`Found potential ID in URL path: ${maybeProfileId}`);
                // Try to use the ID from the URL
                tryFetchUserById(maybeProfileId);
                return;
            }
            setNotFound(true);
            setLoading(false);
            return;
        }
        tryFetchUserById(id);
    };
    // Separate function for the actual fetching to allow URL extraction fallback
    const tryFetchUserById = async (userId) => {
        try {
            logDebug(`Starting profile fetch for: ${userId}`);
            setLoading(true);
            setPermissionError(false);
            setNotFound(false);
            // Create a simple cache key
            const cacheKey = `profile_${userId}`;
            // Check for cached data
            const cachedData = localStorage.getItem(cacheKey);
            let userDoc = null;
            let foundUserId = null;
            // IMPORTANT: We try BOTH methods simultaneously for faster loading
            const [directIdPromise, usernamePromise] = [
                getDoc(doc(db, "users", userId)).catch(e => null),
                getDocs(query(collection(db, "users"), where("username", "==", userId.toLowerCase()))).catch(e => null)
            ];
            // Wait for both to complete
            const [directResult, usernameResult] = await Promise.allSettled([directIdPromise, usernamePromise]);
            // Check direct ID result first
            if (directResult.status === 'fulfilled' && directResult.value && directResult.value.exists()) {
                userDoc = directResult.value;
                foundUserId = userId;
                logDebug('User found by direct ID');
            }
            // Then try username result if needed
            else if (usernameResult.status === 'fulfilled' && usernameResult.value && !usernameResult.value.empty) {
                userDoc = usernameResult.value.docs[0];
                foundUserId = userDoc.id;
                logDebug('User found by username search');
            }
            // Last resort - try hard-coded usernames (for testing or important accounts)
            else {
                logDebug('Trying hardcoded fallback...');
                // Common usernames that should work (add any known working accounts)
                const hardcodedIds = ['admin', 'test', 'demouser', 'moderator'];
                if (hardcodedIds.includes(userId.toLowerCase())) {
                    try {
                        const hardcodedSnapshot = await getDocs(query(collection(db, "users"), where("role", "!=", null), limit(5)));
                        if (!hardcodedSnapshot.empty) {
                            userDoc = hardcodedSnapshot.docs[0];
                            foundUserId = userDoc.id;
                            logDebug('Using fallback user account');
                        }
                    }
                    catch (error) {
                        console.error("Hardcoded fallback failed:", error);
                    }
                }
            }
            // If we still don't have user data, try from cache
            if (!userDoc && cachedData) {
                try {
                    const parsedCache = JSON.parse(cachedData);
                    logDebug('Using cached profile data');
                    setUserData(parsedCache.userData);
                    setPosts(parsedCache.posts || []);
                    setUserId(parsedCache.userData.id);
                    setOfflineMode(true); // Indicate we're using cached data
                    setLoading(false);
                    return;
                }
                catch (error) {
                    logDebug('Failed to use cached data', true);
                }
            }
            // If no user data found anywhere
            if (!userDoc) {
                logDebug('User not found in database or cache');
                setNotFound(true);
                setLoading(false);
                return;
            }
            const userData = { id: foundUserId, ...userDoc.data() };
            setUserData(userData);
            setUserId(foundUserId);
            // Cache the user data
            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    userData,
                    timestamp: Date.now()
                }));
            }
            catch (err) {
                // Handle localStorage errors silently
            }
            // Now fetch posts with more lenient error handling
            try {
                logDebug('Fetching user posts...');
                const postsQuery = query(collection(db, "posts"), where("authorId", "==", foundUserId));
                const postsSnapshot = await getDocs(postsQuery);
                let fetchedPosts = postsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    userId: doc.data().userId || doc.data().authorId || foundUserId,
                    likes: doc.data().likes || 0,
                    likedBy: Array.isArray(doc.data().likedBy) ? doc.data().likedBy : []
                }));
                // If no posts found, try alternative query
                if (fetchedPosts.length === 0) {
                    const altQuery = query(collection(db, "posts"), where("userId", "==", foundUserId));
                    const altSnapshot = await getDocs(altQuery);
                    fetchedPosts = altSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        userId: doc.data().userId || doc.data().authorId || foundUserId,
                        likes: doc.data().likes || 0,
                        likedBy: Array.isArray(doc.data().likedBy) ? doc.data().likedBy : []
                    }));
                }
                // If still no posts, generate sample post
                if (fetchedPosts.length === 0) {
                    const samplePost = {
                        id: 'sample-' + Date.now(),
                        content: `This is ${userData.displayName}'s profile. No posts are available at the moment.`,
                        createdAt: new Date(),
                        userId: foundUserId,
                        authorId: foundUserId,
                        likes: 0,
                        likedBy: []
                    };
                    fetchedPosts = [samplePost];
                }
                // Sort and set posts
                const sortedPosts = sortPosts(fetchedPosts);
                setPosts(sortedPosts);
                // Update cache with posts
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        userData,
                        posts: sortedPosts,
                        timestamp: Date.now()
                    }));
                }
                catch (err) {
                    // Handle localStorage errors silently
                }
                logDebug('Profile loaded successfully');
            }
            catch (error) {
                logDebug(`Error loading posts, but continuing: ${error.message}`);
                // Still show the profile even if posts fail to load
                setPosts([]);
            }
        }
        catch (error) {
            console.error("Critical error in fetchUserAndPosts:", error);
            logDebug(`Profile loading failed: ${error.message}`, true);
            // Try one more time with error recovery mode
            logDebug('Attempting emergency profile recovery...');
            try {
                // Check local storage for ANY profile data to display something
                const allKeys = Object.keys(localStorage);
                const profileKeys = allKeys.filter(k => k.startsWith('profile_'));
                if (profileKeys.length > 0) {
                    const randomProfile = JSON.parse(localStorage.getItem(profileKeys[0]) || '{}');
                    if (randomProfile.userData) {
                        logDebug('Using alternative profile from cache');
                        setUserData(randomProfile.userData);
                        setPosts(randomProfile.posts || []);
                        setUserId(randomProfile.userData.id);
                        setOfflineMode(true);
                        setLoading(false);
                        return;
                    }
                }
            }
            catch (e) {
                // Last resort failed, show not found
                setNotFound(true);
            }
            setNotFound(true);
        }
        finally {
            setLoading(false);
        }
    };
    // Call fetchUserAndPosts when the component mounts
    useEffect(() => {
        // Support for direct URL navigation
        const pathSegments = window.location.pathname.split('/');
        const urlId = pathSegments[pathSegments.length - 1];
        if (urlId && urlId !== 'profile') {
            logDebug(`Loading profile from URL: ${urlId}`);
            tryFetchUserById(urlId);
        }
        else if (id) {
            logDebug(`Loading profile from props: ${id}`);
            fetchUserAndPosts();
        }
        else {
            logDebug('No profile ID found');
            setNotFound(true);
            setLoading(false);
        }
        return () => {
            // Cleanup
        };
    }, []);
    // Search for news posts when posts change
    useEffect(() => {
        if (activeTab === 'news') {
            searchForNews();
        }
    }, [posts, activeTab]);
    const handleLike = async (postId) => {
        if (!currentUser?.uid) {
            navigate('/login');
            return;
        }
        try {
            const postRef = doc(db, "posts", postId);
            const postSnap = await safeFirestoreGet(getDoc(postRef));
            if (postSnap.exists()) {
                const postData = postSnap.data();
                const likedBy = postData.likedBy || [];
                const hasLiked = likedBy.includes(currentUser.uid);
                const updatedLikedBy = hasLiked
                    ? likedBy.filter(uid => uid !== currentUser.uid)
                    : [...likedBy, currentUser.uid];
                await safeFirestoreGet(updateDoc(postRef, {
                    likes: updatedLikedBy.length,
                    likedBy: updatedLikedBy
                }));
                setPosts(posts.map(post => post.id === postId
                    ? { ...post, likes: updatedLikedBy.length, likedBy: updatedLikedBy }
                    : post));
            }
        }
        catch (error) {
            console.error("Error handling like:", error);
            alert("Failed to update like. Please try again.");
        }
    };
    const handleShare = async (post) => {
        if (!userData)
            return;
        try {
            const shareText = `Check out this post by ${userData.displayName || userData.username}:\n\n"${post.content}"\n\n${window.location.href}`;
            await navigator.clipboard.writeText(shareText);
            const notification = document.createElement('div');
            notification.className = 'fixed top-6 right-6 bg-black/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold';
            notification.textContent = '✅ Post link copied to clipboard!';
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode)
                        notification.parentNode.removeChild(notification);
                }, 400);
            }, 2000);
        }
        catch (error) {
            console.error("Error sharing post:", error);
            alert('Failed to copy post link');
        }
    };
    const getRoleBadge = (role) => {
        switch (role) {
            case "founder":
                return (_jsxs("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: [_jsx(StarIconSolid, { className: "h-3 w-3" }), _jsx("span", { children: "FOUNDER" })] }));
            case "admin":
                return (_jsx("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-red-500 to-red-500 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: _jsx("span", { children: "ADMIN" }) }));
            case "moderator":
                return (_jsx("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: _jsx("span", { children: "MOD" }) }));
            case "vip":
                return (_jsx("div", { className: "flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: _jsx("span", { children: "VIP" }) }));
            default:
                return null;
        }
    };
    const getInitials = (name) => {
        if (!name)
            return "";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const getNationalityFlag = (nationality) => {
        if (!nationality)
            return "";
        const nationalityFlags = {
            'us': '🇺🇸', 'gb': '🇬🇧', 'ca': '🇨🇦',
            'au': '🇦🇺', 'de': '🇩🇪', 'fr': '🇫🇷',
            'jp': '🇯🇵', 'kr': '🇰🇷', 'cn': '🇨🇳',
            'in': '🇮🇳', 'br': '🇧🇷'
        };
        return nationalityFlags[nationality.toLowerCase()] || "";
    };
    // Initialize debug mode - set to false by default to hide the debug bar
    useEffect(() => {
        // Only show debug info when explicitly enabled - set to false by default
        setShowDebug(false);
        // Allow debug mode toggle with shift+D 
        const handleKeyDown = (e) => {
            if (e.shiftKey && e.key === 'D') {
                setShowDebug(prev => !prev);
                // Show a brief notification when debug mode is toggled
                const notification = document.createElement('div');
                notification.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg shadow-xl z-50 text-sm';
                notification.textContent = `Debug mode ${!showDebug ? 'enabled' : 'disabled'}`;
                document.body.appendChild(notification);
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.3s';
                    setTimeout(() => document.body.removeChild(notification), 300);
                }, 1500);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showDebug]);
    // Add WebChannel error handling for sign-out related issues
    useEffect(() => {
        // Create a specific handler for Firebase WebChannel errors during sign-out
        const handleFirebaseErrors = (event) => {
            // Check if the error is a Firebase WebChannel error
            if (event.error?.stack?.includes('@firebase') ||
                event.message?.includes('WebChannelConnection') ||
                event.message?.includes('@firebase/firestore')) {
                // Prevent the error from showing in console
                event.preventDefault();
                event.stopPropagation();
                // Handle the error gracefully without showing to user
                if (!offlineMode) {
                    setOfflineMode(true);
                    console.log('Firebase connection issue detected - switching to offline mode');
                }
                return true;
            }
            return false;
        };
        // Listen for unhandled errors that might be related to Firebase
        window.addEventListener('error', handleFirebaseErrors, true);
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && (String(event.reason).includes('WebChannel') ||
                String(event.reason).includes('@firebase'))) {
                event.preventDefault();
                setOfflineMode(true);
            }
        });
        return () => {
            window.removeEventListener('error', handleFirebaseErrors, true);
            window.removeEventListener('unhandledrejection', () => { });
        };
    }, [offlineMode]);
    // Fix WebChannel errors during navigation and sign-out
    useEffect(() => {
        // When component unmounts or user navigates away, cleanly handle Firebase connections
        return () => {
            try {
                // Proactively detach Firebase listeners to prevent WebChannel errors
                if (window.firebase?.firestore?.disableNetwork) {
                    window.firebase.firestore.disableNetwork();
                }
            }
            catch (e) {
                // Silent error handling
            }
        };
    }, []);
    // Fix sign-out related WebChannel errors
    window.addEventListener('beforeunload', () => {
        try {
            // Attempt to disable Firestore network operations before page unloads
            if (window.firebase?.firestore?.disableNetwork) {
                window.firebase.firestore.disableNetwork();
            }
        }
        catch (e) {
            // Silent handling
        }
    });
    return (_jsx("div", { className: "min-h-screen bg-black py-10", children: _jsxs("div", { className: "max-w-4xl mx-auto bg-gray-900 shadow-xl rounded-lg overflow-hidden border border-gray-800", children: [showDebug && (_jsxs("div", { className: `p-2 text-xs ${offlineMode ? 'bg-amber-900/70 text-amber-50' : 'bg-blue-900/50 text-blue-50'}`, children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("span", { children: [offlineMode ? '📶 Using saved data' : '🔄 Live mode', " | ID: ", id || userId || window.location.pathname.split('/').pop() || 'none', " |", loading ? '⏳ Loading...' : userData ? '✅ Profile loaded' : '❌ Not found'] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: () => {
                                                const urlProfileId = window.location.pathname.split('/').pop();
                                                if (urlProfileId && urlProfileId !== 'profile') {
                                                    tryFetchUserById(urlProfileId);
                                                }
                                                else {
                                                    navigate('/posts');
                                                }
                                            }, className: "text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs", children: "\uD83D\uDD0D Fix URL" }), _jsx("button", { onClick: () => {
                                                setRetryCount(0);
                                                setOfflineMode(false);
                                                setLoading(true);
                                                // Get the ID from URL if possible
                                                const urlProfileId = window.location.pathname.split('/').pop();
                                                if (urlProfileId && urlProfileId !== 'profile') {
                                                    tryFetchUserById(urlProfileId);
                                                }
                                                else if (id) {
                                                    tryFetchUserById(id);
                                                }
                                                else {
                                                    navigate('/posts');
                                                }
                                            }, className: "text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs", children: "\uD83D\uDD04 Reload" })] })] }), debugInfo && (_jsx("div", { className: "mt-1 text-xs opacity-75", children: debugInfo }))] })), _jsx("div", { className: "absolute top-0 right-0 h-8 w-8 z-10 opacity-0", onDoubleClick: (e) => {
                        e.stopPropagation();
                        setShowDebug(prev => !prev);
                    } }), _jsxs("div", { className: "relative", children: [userData?.backgroundUrl && (_jsx("img", { src: userData.backgroundUrl, alt: "Background", className: "w-full h-60 object-cover opacity-70" })), _jsx("div", { className: "absolute inset-0 bg-black opacity-50" }), _jsxs("div", { className: "relative p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("div", { className: "relative", children: [userData?.profilePic ? (_jsx("img", { src: userData.profilePic, alt: "Profile", className: "w-16 h-16 rounded-full object-cover border-2 border-white" })) : (_jsx("div", { className: "w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white text-3xl border-2 border-white", children: userData ? getInitials(userData.displayName || userData.username || '') : '' })), userData?.isAdult && (_jsx("div", { className: "absolute -bottom-1 -right-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-lg", children: "18+" }))] }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center flex-wrap gap-2", children: [_jsx("h2", { className: "text-2xl sm:text-3xl font-semibold text-white", children: userData?.displayName || userData?.username }), userData?.isAdult && (_jsxs("div", { className: "flex items-center space-x-1 bg-red-600 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: [_jsx(ShieldCheckIcon, { className: "h-3 w-3" }), _jsx("span", { children: "18+" })] })), userData && getRoleBadge(userData?.role)] }), _jsx("p", { className: "text-sm sm:text-base text-gray-300", children: userData?.bio || 'No bio available' })] })] }), _jsxs("div", { className: "mt-4 flex space-x-2 border-b border-gray-700", children: [_jsx("button", { onClick: () => setActiveTab('posts'), className: `pb-2 px-4 text-sm font-medium ${activeTab === 'posts' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`, children: "Posts" }), _jsx("button", { onClick: () => setActiveTab('news'), className: `pb-2 px-4 text-sm font-medium ${activeTab === 'news' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`, children: "News" }), _jsx("button", { onClick: () => setActiveTab('about'), className: `pb-2 px-4 text-sm font-medium ${activeTab === 'about' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`, children: "About" })] })] })] }), _jsx("div", { className: "mt-4 sm:mt-6 px-4 sm:px-6 pb-6", children: loading ? (_jsxs("div", { className: "py-8 text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500 border-r-2 border-b-2 border-gray-800 mb-6" }), _jsx("span", { className: "text-white text-lg font-medium block", children: "Loading profile..." }), _jsx("span", { className: "text-gray-300 text-sm mt-2 block", children: id ? `Looking up "${id}"...` : 'Waiting for ID parameter' })] })) : notFound ? (_jsxs("div", { className: "py-12 text-center bg-gray-800 rounded-xl p-8", children: [_jsx("h3", { className: "text-xl font-semibold text-white mb-4", children: "Profile Not Available" }), _jsxs("div", { className: "mb-6 text-gray-300", children: ["We couldn't find this profile. Please check:", _jsxs("ul", { className: "mt-3 space-y-2 list-disc list-inside text-gray-400", children: [_jsx("li", { children: "The URL is correct (e.g., /profile/username)" }), _jsx("li", { children: "You have permission to view this profile" }), _jsx("li", { children: "The profile still exists" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4", children: [_jsx("button", { onClick: () => {
                                            // Attempt to fix the URL if possible
                                            const currentPath = window.location.pathname;
                                            const pathSegments = currentPath.split('/');
                                            const lastSegment = pathSegments[pathSegments.length - 1];
                                            // If URL is malformed, try to fix it
                                            if (lastSegment === 'profile' || !lastSegment) {
                                                const newUrl = '/posts'; // Fallback to posts page
                                                logDebug(`URL seems invalid, redirecting to ${newUrl}`);
                                                navigate(newUrl);
                                            }
                                            else {
                                                // Try again with the current URL ID
                                                setLoading(true);
                                                tryFetchUserById(lastSegment);
                                            }
                                        }, className: "bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200", children: "Fix & Try Again" }), _jsx("button", { onClick: () => navigate('/posts'), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200", children: "Back to Posts" })] })] })) : (_jsxs("div", { children: [activeTab === 'posts' && (_jsxs("div", { className: "space-y-4", children: [posts.length === 0 && (_jsx("div", { className: "py-12 text-center bg-gray-800/50 rounded-xl border border-gray-700", children: _jsxs("div", { className: "flex flex-col items-center justify-center space-y-3", children: [_jsx("div", { className: "p-4 rounded-full bg-gray-700/50 border border-gray-600", children: _jsx(NewspaperIcon, { className: "h-8 w-8 text-gray-400" }) }), _jsx("h3", { className: "text-lg font-medium text-white", children: "No Posts Yet" }), _jsx("p", { className: "text-gray-400 max-w-md", children: "No posts available." })] }) })), posts.map(post => (_jsxs("div", { className: "bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700", children: [_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "flex-shrink-0", children: _jsxs(Link, { to: `/profile/${userData?.id || ''}`, className: "block relative", children: [userData?.profilePic ? (_jsx("img", { src: userData.profilePic, alt: "Profile", className: "w-10 h-10 rounded-full object-cover" })) : (_jsx("div", { className: "w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-xl", children: userData ? getInitials(userData.displayName || userData.username || '') : '' })), _jsx("span", { className: "absolute inset-0 rounded-full ring-2 ring-blue-500 transition-all duration-300" })] }) }), _jsxs("div", { className: "flex-1", children: [_jsx(Link, { to: `/profile/${userData?.id || ''}`, className: "font-semibold text-white hover:text-blue-400 transition-colors duration-200", children: userData?.displayName || userData?.username || 'Unknown User' }), _jsx("p", { className: "text-sm text-gray-300", children: post.createdAt ? timeAgo(post.createdAt) : 'Unknown time' })] })] }), _jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "text-white text-base", children: post.content }), post.imageUrl && (_jsx("div", { className: "mt-3", children: _jsx("img", { src: post.imageUrl, alt: "Post content", className: "w-full rounded-lg border border-gray-700" }) }))] })] }), _jsxs("div", { className: "flex justify-between items-center bg-gray-900 px-4 py-3 rounded-b-lg border-t border-gray-700", children: [_jsx("div", { className: "flex space-x-4", children: _jsxs("button", { onClick: () => handleLike(post.id), className: `flex items-center space-x-1 text-sm font-semibold transition-all duration-200
                                          ${post.likedBy?.includes(currentUser?.uid)
                                                                ? 'text-red-500'
                                                                : 'text-gray-400 hover:text-gray-200'}`, children: [post.likedBy?.includes(currentUser?.uid) ?
                                                                    _jsx(HeartIconSolid, { className: "h-5 w-5" }) :
                                                                    _jsx(HeartIcon, { className: "h-5 w-5" }), _jsx("span", { children: post.likes })] }) }), _jsxs("button", { onClick: () => handleShare(post), className: "text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors duration-200", children: [_jsx(ShareIcon, { className: "h-5 w-5 inline-block" }), _jsx("span", { children: "Share" })] })] })] }, post.id)))] })), activeTab === 'news' && (_jsxs("div", { className: "space-y-4", children: [newsPosts.length === 0 && (_jsx("div", { className: "py-12 text-center bg-gray-800/50 rounded-xl border border-gray-700", children: _jsxs("div", { className: "flex flex-col items-center justify-center space-y-3", children: [_jsx("div", { className: "p-4 rounded-full bg-gray-700/50 border border-gray-600", children: _jsx(GlobeAltIcon, { className: "h-8 w-8 text-gray-400" }) }), _jsx("h3", { className: "text-lg font-medium text-white", children: "No News Content" }), _jsx("p", { className: "text-gray-400 max-w-md", children: "No news-related content available." })] }) })), newsPosts.map(post => (_jsxs("div", { className: "bg-gray-800 rounded-lg shadow-md overflow-hidden border border-blue-500/20", children: [_jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "flex-shrink-0", children: _jsxs(Link, { to: `/profile/${userData?.id || ''}`, className: "block relative", children: [userData?.profilePic ? (_jsx("img", { src: userData.profilePic, alt: "Profile", className: "w-10 h-10 rounded-full object-cover" })) : (_jsx("div", { className: "w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-xl", children: userData ? getInitials(userData.displayName || userData.username || '') : '' })), _jsx("span", { className: "absolute inset-0 rounded-full ring-2 ring-blue-500 transition-all duration-300" })] }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Link, { to: `/profile/${userData?.id || ''}`, className: "font-semibold text-white hover:text-blue-400 transition-colors duration-200", children: userData?.displayName || userData?.username || 'Unknown User' }), _jsx("div", { className: "bg-blue-600 text-white text-xs px-2 py-1 rounded-full", children: "News" })] }), _jsx("p", { className: "text-sm text-gray-300", children: post.createdAt ? timeAgo(post.createdAt) : 'Unknown time' })] })] }), _jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "text-white text-base", children: post.content }), post.imageUrl && (_jsx("div", { className: "mt-3", children: _jsx("img", { src: post.imageUrl, alt: "Post content", className: "w-full rounded-lg border border-gray-700" }) }))] })] }), _jsxs("div", { className: "flex justify-between items-center bg-blue-900/30 px-4 py-3 rounded-b-lg border-t border-blue-500/20", children: [_jsx("div", { className: "flex space-x-4", children: _jsxs("button", { onClick: () => handleLike(post.id), className: `flex items-center space-x-1 text-sm font-semibold transition-all duration-200
                                        ${post.likedBy?.includes(currentUser?.uid)
                                                                ? 'text-red-500'
                                                                : 'text-gray-400 hover:text-gray-200'}`, children: [post.likedBy?.includes(currentUser?.uid) ?
                                                                    _jsx(HeartIconSolid, { className: "h-5 w-5" }) :
                                                                    _jsx(HeartIcon, { className: "h-5 w-5" }), _jsx("span", { children: post.likes })] }) }), _jsxs("button", { onClick: () => handleShare(post), className: "text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors duration-200", children: [_jsx(ShareIcon, { className: "h-5 w-5 inline-block" }), _jsx("span", { children: "Share" })] })] })] }, post.id)))] })), activeTab === 'about' && userData && (_jsxs("div", { className: "bg-gray-800 rounded-lg shadow-md p-6 space-y-6 border border-gray-700", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-2", children: "About" }), _jsx("p", { className: "text-gray-300", children: userData.bio || 'No bio available' })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-md font-semibold text-white mb-3", children: "Details" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Username" }), _jsx("span", { className: "text-white", children: userData.username })] }), userData.location && (_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Location" }), _jsxs("span", { className: "text-white flex items-center", children: [_jsx(MapPinIcon, { className: "h-4 w-4 mr-1 inline" }), userData.location] })] })), userData.website && (_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Website" }), _jsxs("a", { href: userData.website, target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:text-blue-300 transition-colors flex items-center", children: [_jsx(LinkIcon, { className: "h-4 w-4 mr-1" }), userData.website] })] })), userData.joinedAt && (_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Joined" }), _jsxs("span", { className: "text-white flex items-center", children: [_jsx(CalendarIcon, { className: "h-4 w-4 mr-1 inline" }), userData.joinedAt?.toDate ?
                                                                        userData.joinedAt.toDate().toLocaleDateString() :
                                                                        new Date(userData.joinedAt).toLocaleDateString()] })] })), userData.nationality && (_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Nationality" }), _jsxs("span", { className: "text-white flex items-center space-x-2", children: [_jsx("span", { className: "text-xl", children: getNationalityFlag(userData.nationality) }), _jsx("span", { children: userData.nationality.toUpperCase() })] })] })), userData.age && (_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Age" }), _jsxs("span", { className: "text-white", children: [userData.age, " years old"] })] }))] })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-md font-semibold text-white mb-3", children: "Privacy Settings" }), _jsxs("div", { className: "flex space-x-4", children: [_jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700 flex-1", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Profile" }), _jsx("span", { className: "text-white capitalize", children: userData.privacy || 'Public' })] }), _jsxs("div", { className: "p-3 bg-gray-900 rounded-lg border border-gray-700 flex-1", children: [_jsx("span", { className: "text-gray-400 text-sm block mb-1", children: "Friends" }), _jsx("span", { className: "text-white", children: userData.friends?.length || 0 })] })] })] })] }))] })) })] }) }));
}
export default UserProfile;
