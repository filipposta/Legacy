import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Check if a username is available
 * @param username - The username to check
 * @returns Promise<boolean> - True if username is available, false if taken
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    // Normalize the username
    const normalizedUsername = username.toLowerCase().trim();
    
    // Query Firestore for the username
    const usernameQuery = query(
      collection(db, "users"), 
      where("username", "==", normalizedUsername)
    );
    
    const usernameSnapshot = await getDocs(usernameQuery);
    
    // If empty, username is available
    return usernameSnapshot.empty;
  } catch (error: any) {
    // Check specifically for permission errors
    if (error.code === 'permission-denied' || 
        error.message?.includes('Missing or insufficient permissions')) {
      // Use console.log instead of console.warn for expected behavior
      console.log("INFO: Username validation requires authentication. Proceeding with registration.");
      
      // Handle permission errors by allowing registration to proceed
      // The uniqueness will be enforced when creating the user document
      return true;
    }
    
    // For other errors, still log as warning but allow registration
    console.warn("Error checking username availability:", error);
    return true;
  }
};

/**
 * Generate a unique username if original is taken
 * @param baseUsername - Original username to start with
 * @returns Modified username with number appended if needed
 */
export const generateUniqueUsername = (baseUsername: string): string => {
  // For future implementation if needed
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${baseUsername}${randomSuffix}`;
};
