/**
 * Network error handling utilities specifically for Firestore connection issues
 */
import { db } from "../firebase";
import { enableNetwork, disableNetwork } from "firebase/firestore";
// Track connection state to avoid multiple recovery attempts
let recovering = false;
let networkEnabled = true;
/**
 * Handles Firestore QUIC and WebChannel protocol errors by:
 * 1. Temporarily disabling network connections
 * 2. Enabling it again after a short delay
 * This often resolves the ERR_QUIC_PROTOCOL_ERROR issues
 */
export const handleFirestoreConnectionError = async (error) => {
    // Check if this is a network-related error
    const isNetworkError = error && (error.code === 'failed-precondition' ||
        error.code === 'unavailable' ||
        error.code === 'resource-exhausted' ||
        (typeof error.message === 'string' && (error.message.includes('QUIC_PROTOCOL_ERROR') ||
            error.message.includes('WebChannel') ||
            error.message.includes('status of 400') ||
            error.message.includes('network error') ||
            error.message.includes('Network Error') ||
            error.message.includes('internal error'))));
    if (!isNetworkError || recovering) {
        return false;
    }
    try {
        recovering = true;
        console.log("🔄 Attempting to recover from Firestore connection issue");
        // Disable network to clear problematic connections
        if (networkEnabled) {
            await disableNetwork(db);
            networkEnabled = false;
            // Wait briefly to allow connections to close
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        // Re-enable network after cooling period
        await enableNetwork(db);
        networkEnabled = true;
        console.log("✅ Firestore connection recovery successful");
        return true;
    }
    catch (recoveryError) {
        console.warn("❌ Failed to recover Firestore connection:", recoveryError);
        return false;
    }
    finally {
        recovering = false;
    }
};
/**
 * Global error interceptor to catch and suppress QUIC protocol errors
 * and other Firestore connection issues in the console
 */
export const setupNetworkErrorInterceptor = () => {
    // Create a deep link to the original methods
    const originalFetch = window.fetch;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    // Patch fetch to intercept network errors
    window.fetch = async function (...args) {
        try {
            const response = await originalFetch.apply(this, args);
            // Check if this is a failed Firestore request
            if (!response.ok &&
                args[0] &&
                typeof args[0] === 'string' &&
                args[0].includes('firestore.googleapis.com')) {
                // Don't log this error, but attempt recovery if it's a 400 error
                if (response.status === 400) {
                    setTimeout(() => {
                        handleFirestoreConnectionError({
                            message: `Firestore request failed with status ${response.status}`
                        }).catch(() => { });
                    }, 100);
                }
            }
            return response;
        }
        catch (error) {
            // Attempt recovery for network errors related to Firestore
            if (args[0] &&
                typeof args[0] === 'string' &&
                args[0].includes('firestore.googleapis.com')) {
                handleFirestoreConnectionError(error).catch(() => { });
            }
            // Re-throw to not interfere with normal operation
            throw error;
        }
    };
    // Filter console errors to prevent noise from Firestore issues
    console.error = function (...args) {
        if (args[0] && typeof args[0] === 'string') {
            if (args[0].includes('QUIC_PROTOCOL_ERROR') ||
                args[0].includes('WebChannel') ||
                args[0].includes('firestore.googleapis.com') ||
                args[0].includes('status of 400')) {
                // Ignore this error in the console and attempt recovery
                setTimeout(() => {
                    handleFirestoreConnectionError({ message: args[0] }).catch(() => { });
                }, 0);
                return;
            }
        }
        originalConsoleError.apply(this, args);
    };
    // Filter console warnings for Firestore connection issues
    console.warn = function (...args) {
        if (args[0] && typeof args[0] === 'string') {
            if (args[0].includes('QUIC_PROTOCOL_ERROR') ||
                args[0].includes('WebChannel') ||
                args[0].includes('firestore.googleapis.com') ||
                args[0].includes('@firebase/firestore')) {
                // Ignore this warning
                return;
            }
        }
        originalConsoleWarn.apply(this, args);
    };
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        if (error && typeof error.message === 'string' &&
            (error.message.includes('QUIC_PROTOCOL_ERROR') ||
                error.message.includes('WebChannel') ||
                error.message.includes('firestore.googleapis.com'))) {
            // Prevent default browser handling of the error
            event.preventDefault();
            // Attempt recovery
            handleFirestoreConnectionError(error).catch(() => { });
        }
    });
    return () => {
        // Restore original functions if needed
        window.fetch = originalFetch;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    };
};
/**
 * Monitor and automatically reconnect Firestore when connection is lost
 */
export const startConnectionMonitoring = () => {
    // Check online status periodically
    const interval = setInterval(() => {
        if (navigator.onLine && !networkEnabled) {
            enableNetwork(db)
                .then(() => {
                networkEnabled = true;
                console.log("✅ Firestore network connection restored");
            })
                .catch(() => { });
        }
    }, 30000); // Check every 30 seconds
    // Listen for online/offline events
    const handleOnline = () => {
        if (!networkEnabled) {
            enableNetwork(db)
                .then(() => {
                networkEnabled = true;
                console.log("✅ Firestore network connection restored after coming back online");
            })
                .catch(() => { });
        }
    };
    const handleOffline = () => {
        if (networkEnabled) {
            disableNetwork(db)
                .then(() => {
                networkEnabled = false;
                console.log("⚠️ Device went offline, Firestore network disabled");
            })
                .catch(() => { });
        }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};
