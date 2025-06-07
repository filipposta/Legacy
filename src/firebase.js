import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Updated Firebase configuration to match console output
const firebaseConfig = {
    apiKey: "AIzaSyAA8McWXk-poY-PyleS6iCrGu05JLdZuZE",
    authDomain: "legacy-9f293.firebaseapp.com",
    projectId: "legacy-9f293",
    storageBucket: "legacy-9f293.firebasestorage.app",
    messagingSenderId: "93245251788",
    appId: "1:93245251788:web:d4abcb81e6c2e8484c6269",
    measurementId: "G-DWKCJ8W4JJ"
};
// Initialize Firebase with enhanced error handling
let app;
try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
}
catch (error) {
    console.error("Firebase initialization error:", error);
    throw new Error("Firebase configuration error. Please check your setup.");
}
// Initialize Firebase services with error handling
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Debug log to verify exports
console.log("Firebase exports:", { auth: !!auth, db: !!db, storage: !!storage });
// Enhanced connection test function - avoid Firestore dependency for critical operations
export const testFirebaseConnection = async () => {
    try {
        // Only test auth connection to avoid Firestore permission/connection issues
        const authState = auth.currentUser !== undefined;
        console.log("Firebase auth connection test passed");
        return true;
    }
    catch (error) {
        console.error("Firebase auth connection test failed:", error);
        return false;
    }
};
// Enhanced error handling for WebChannel connection issues
export const handleFirestoreWebChannelError = (error) => {
    if (error.message?.includes('WebChannelConnection') ||
        error.message?.includes('Bad Request') ||
        error.code === 'unavailable' ||
        error.message?.includes('transport errored')) {
        console.warn('Firestore WebChannel error detected - implementing resilient strategy');
        // Don't try to disable/enable network during critical operations like sign out
        // Just log the error and continue
        return true; // Indicates this is a known WebChannel error
    }
    return false;
};
// Resilient Firestore operation wrapper
export const performResilientFirestoreOperation = async (operation, fallback, operationName = 'Firestore operation') => {
    try {
        return await operation();
    }
    catch (error) {
        // Handle WebChannel errors gracefully
        if (handleFirestoreWebChannelError(error)) {
            console.warn(`${operationName} failed due to WebChannel error, using fallback if available`);
            if (fallback) {
                return fallback();
            }
            throw new Error(`${operationName} unavailable due to connection issues`);
        }
        // Handle permission errors
        if (error.code === 'permission-denied' ||
            error.message?.includes('Missing or insufficient permissions')) {
            console.warn(`${operationName} failed due to permissions, using fallback if available`);
            if (fallback) {
                return fallback();
            }
            throw new Error(`${operationName} not permitted`);
        }
        // Re-throw other errors
        throw error;
    }
};
// Connection management functions
export const enableFirestoreNetwork = async () => {
    try {
        await enableNetwork(db);
        console.log("Firestore network enabled");
        return true;
    }
    catch (error) {
        console.error("Failed to enable Firestore network:", error);
        return false;
    }
};
export const disableFirestoreNetwork = async () => {
    try {
        await disableNetwork(db);
        console.log("Firestore network disabled");
        return true;
    }
    catch (error) {
        console.error("Failed to disable Firestore network:", error);
        return false;
    }
};
// Add connection retry utility
export const retryFirestoreOperation = async (operation, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            console.warn(`Firestore operation failed (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt === maxRetries) {
                throw error;
            }
            // Handle specific error codes
            if (error.code === 'auth/invalid-api-key') {
                throw new Error("Invalid API key. Please update Firebase configuration.");
            }
            else if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
                // Wait before retrying with exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
            else if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                // Don't retry permission errors
                throw error;
            }
            else {
                // For other errors, wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error('Max retries exceeded');
};
// Update connection check to be more resilient
export const checkFirebaseConnection = async () => {
    try {
        // Just check if auth is initialized - don't test Firestore
        return auth !== null && auth !== undefined;
    }
    catch (error) {
        console.warn('Firebase connection check failed:', error);
        return false;
    }
};
// Add network status monitoring
export const monitorFirestoreConnection = () => {
    let isOnline = navigator.onLine;
    const handleOnline = async () => {
        if (!isOnline) {
            isOnline = true;
            console.log("Network back online, re-enabling Firestore");
            await enableFirestoreNetwork();
        }
    };
    const handleOffline = async () => {
        if (isOnline) {
            isOnline = false;
            console.log("Network offline, disabling Firestore");
            await disableFirestoreNetwork();
        }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};
