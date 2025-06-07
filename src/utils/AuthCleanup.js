import { auth, db } from "../firebase";
import { enableNetwork, disableNetwork } from "firebase/firestore";
/**
 * Enhanced sign out function that properly cleans up Firebase listeners
 * before completing the sign out process
 */
export const safeSignOut = async () => {
    try {
        // 1. Notify all components to clean up their listeners
        window.dispatchEvent(new Event('scysocialSignOutStarted'));
        // 2. Small delay to allow cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // 3. Disable Firestore network to prevent WebChannel errors
        try {
            // This is the key fix - disable Firestore networking before sign out
            // This prevents the 400 Bad Request error from WebChannelConnection
            await disableNetwork(db).catch(() => {
                console.log("Failed to disable Firestore network, continuing with sign out");
            });
        }
        catch (e) {
            // Silently continue if disableNetwork fails
            console.log("Error disabling network:", e);
        }
        // 4. Now proceed with actual sign out
        await auth.signOut();
        // 5. Notify components that sign out is complete
        window.dispatchEvent(new Event('scysocialSignOutCompleted'));
        // 6. Try to re-enable network after a short delay for future sessions
        setTimeout(() => {
            try {
                enableNetwork(db).catch(() => { });
            }
            catch (e) {
                // Silently ignore any errors
            }
        }, 1000);
        return true;
    }
    catch (error) {
        console.error('Sign out failed:', error);
        return false;
    }
};
/**
 * Register a cleanup function that will be called on sign out
 */
export const registerSignOutCleanup = (cleanupFn) => {
    const handleSignOut = () => {
        try {
            cleanupFn();
        }
        catch (e) {
            console.error('Error in cleanup function:', e);
        }
    };
    window.addEventListener('scysocialSignOutStarted', handleSignOut);
    // Return unsubscribe function
    return () => window.removeEventListener('scysocialSignOutStarted', handleSignOut);
};
/**
 * Global handler to prevent WebChannel errors from appearing in console
 * Call this once in your app initialization
 */
export const setupWebChannelErrorSuppression = () => {
    // Create interceptor for WebChannel errors
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    // Replace console.warn and error to filter out WebChannel errors
    console.warn = function (...args) {
        if (args[0] &&
            (typeof args[0] === 'string' &&
                (args[0].includes('WebChannelConnection') ||
                    args[0].includes('@firebase/firestore') ||
                    args[0].includes('transport errored')))) {
            // Silently ignore WebChannel errors during sign out
            return;
        }
        originalConsoleWarn.apply(console, args);
    };
    console.error = function (...args) {
        if (args[0] &&
            (typeof args[0] === 'string' &&
                (args[0].includes('WebChannelConnection') ||
                    args[0].includes('@firebase/firestore') ||
                    args[0].includes('transport errored')))) {
            // Silently ignore WebChannel errors during sign out
            return;
        }
        originalConsoleError.apply(console, args);
    };
    // Also handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason &&
            typeof event.reason.toString === 'function' &&
            event.reason.toString().includes('WebChannel')) {
            event.preventDefault();
        }
    });
    return () => {
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    };
};
/**
 * Utility to safely detach Firebase listeners - use this in component cleanup
 * @param listeners Array of unsubscribe functions returned by onSnapshot, etc.
 */
export const detachFirebaseListeners = (listeners) => {
    if (!Array.isArray(listeners))
        return;
    listeners.forEach(unsubscribe => {
        try {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        }
        catch (e) {
            // Silently handle errors
        }
    });
};
/**
 * Sets consistent auth state across multiple storage mechanisms
 * to prevent UI flickering during navigation
 */
export const setAuthState = (isAuthenticated) => {
    if (isAuthenticated) {
        localStorage.setItem('userAuthenticated', 'true');
        sessionStorage.setItem('authStatus', 'authenticated');
    }
    else {
        localStorage.removeItem('userAuthenticated');
        sessionStorage.removeItem('authStatus');
    }
};
/**
 * Checks if the user has any indication of being authenticated
 * across multiple storage mechanisms
 */
export const checkAuthState = () => {
    return localStorage.getItem('userAuthenticated') === 'true' ||
        sessionStorage.getItem('authStatus') === 'authenticated';
};
