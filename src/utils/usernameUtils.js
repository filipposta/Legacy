import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
/**
 * Check if a username is available (not already taken)
 * @param username - The username to check
 * @returns Promise<boolean> - true if available, false if taken
 */
export const isUsernameAvailable = async (username) => {
    try {
        if (!username || typeof username !== 'string') {
            throw new Error('Invalid username provided');
        }
        const normalizedUsername = username.toLowerCase().trim();
        if (normalizedUsername.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        // Query Firestore to check if username exists
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", normalizedUsername));
        const querySnapshot = await getDocs(q);
        // If no documents found, username is available
        return querySnapshot.empty;
    }
    catch (error) {
        console.error("Error checking username availability:", error);
        // In case of error, assume username is not available for safety
        return false;
    }
};
/**
 * Generate a unique username by adding a random suffix
 * @param baseUsername - The base username to make unique
 * @returns string - A unique username
 */
export const generateUniqueUsername = async (baseUsername) => {
    try {
        const normalizedBase = baseUsername.toLowerCase().trim();
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const candidateUsername = `${normalizedBase}${randomSuffix}`;
            const isAvailable = await isUsernameAvailable(candidateUsername);
            if (isAvailable) {
                return candidateUsername;
            }
            attempts++;
        }
        // If we can't find a unique username after max attempts, use timestamp
        const timestamp = Date.now().toString().slice(-4);
        return `${normalizedBase}${timestamp}`;
    }
    catch (error) {
        console.error("Error generating unique username:", error);
        // Fallback to timestamp-based username
        const timestamp = Date.now().toString().slice(-4);
        return `${baseUsername.toLowerCase().trim()}${timestamp}`;
    }
};
/**
 * Validate username format
 * @param username - The username to validate
 * @returns { valid: boolean, error?: string }
 */
export const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return { valid: false, error: 'Username is required' };
    }
    const trimmed = username.trim();
    if (trimmed.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (trimmed.length > 20) {
        return { valid: false, error: 'Username must be less than 20 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
        return { valid: false, error: 'Username cannot start or end with underscore' };
    }
    // Check for reserved usernames
    const reservedUsernames = ['admin', 'root', 'user', 'test', 'legacy', 'system', 'api', 'www', 'mail', 'support'];
    if (reservedUsernames.includes(trimmed.toLowerCase())) {
        return { valid: false, error: 'This username is reserved' };
    }
    return { valid: true };
};
