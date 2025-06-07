import { useEffect } from "react";
import { recordProfileView } from "../utils/profileViews";
export const useProfileView = (profileUserId) => {
    useEffect(() => {
        console.log("🪝 useProfileView hook triggered with:", profileUserId);
        if (profileUserId) {
            console.log("⏰ Setting timer to record profile view");
            // Add a small delay to ensure auth is ready
            const timer = setTimeout(() => {
                console.log("🚀 Timer fired, calling recordProfileView");
                recordProfileView(profileUserId);
            }, 1000);
            return () => {
                console.log("🧹 Cleaning up timer");
                clearTimeout(timer);
            };
        }
        else {
            console.log("❌ No profileUserId provided to useProfileView");
        }
    }, [profileUserId]);
};
