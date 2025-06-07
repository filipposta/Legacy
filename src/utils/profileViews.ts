import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Test function to verify profile view recording works
export const testProfileViewRecording = async () => {
  console.log("Testing profile view recording...");
  const testUserId = "test-user-123"; // Use a fake user ID for testing
  await recordProfileView(testUserId);
};

export const recordProfileView = async (viewedUserId: string) => {
  console.log("🔍 Starting recordProfileView function");
  console.log("📝 Input viewedUserId:", viewedUserId);
  
  try {
    const currentUser = auth.currentUser;
    console.log("👤 Current user:", currentUser?.uid);
    
    if (!currentUser) {
      console.log("❌ No authenticated user");
      return;
    }
    
    if (currentUser.uid === viewedUserId) {
      console.log("❌ Self-view detected, skipping");
      return;
    }

    console.log("✅ Recording profile view:", { viewerId: currentUser.uid, viewedUserId });

    try {
      await addDoc(collection(db, "profileViews"), {
        viewerId: currentUser.uid,
        viewedUserId: viewedUserId,
        timestamp: serverTimestamp(),
      });
      
      console.log("✅ Profile view recorded successfully");
      return;
    } catch (writeError: any) {
      console.error("❌ Write error:", writeError);
      if (writeError.code === 'permission-denied') {
        console.error("🚫 Permission denied writing profile view. Please update Firestore security rules.");
        return null;
      }
      throw writeError;
    }

  } catch (error: any) {
    console.error("💥 Error recording profile view:", error);
    return null;
  }
};

// Simple function to call from UserProfile component
export const recordProfileViewForUser = (userId: string) => {
  console.log("🎯 recordProfileViewForUser called with:", userId);
  
  // Wait a bit for auth to be ready, then record the view
  setTimeout(() => {
    recordProfileView(userId);
  }, 1000);
};
