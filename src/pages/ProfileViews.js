import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, getDoc, doc, limit, deleteDoc } from "firebase/firestore";
import { ClockIcon, ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/outline";
const ProfileViews = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewData, setViewData] = useState([]);
    const [error, setError] = useState(null);
    const [cleaning, setCleaning] = useState(false);
    const navigate = useNavigate();
    // Helper to load a user profile with fresh data and CORS handling
    const loadUserProfile = async (userId) => {
        try {
            console.log(`🔍 Loading fresh profile for user: ${userId}`);
            // Force fresh fetch by adding cache-busting parameter
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                console.log(`✅ Raw profile data for ${userId}:`, {
                    username: data.username,
                    displayName: data.displayName,
                    profileImage: data.profileImage,
                    profilePic: data.profilePic,
                    hasProfileImage: !!data.profileImage,
                    hasProfilePic: !!data.profilePic
                });
                // Only return profile if user has proper data
                if (data.username && data.username !== "unknown") {
                    // Use profileImage first, then profilePic as fallback
                    let finalProfilePic = data.profileImage || data.profilePic || "";
                    // Handle CORS issues for external images
                    if (finalProfilePic && !finalProfilePic.includes('firebase') && !finalProfilePic.includes('blob:')) {
                        console.log(`⚠️ External image detected for ${data.username}: ${finalProfilePic}`);
                        // Test image accessibility
                        const testImg = new Image();
                        testImg.crossOrigin = 'anonymous';
                        const isAccessible = await new Promise((resolve) => {
                            testImg.onload = () => resolve(true);
                            testImg.onerror = () => resolve(false);
                            testImg.src = finalProfilePic;
                            setTimeout(() => resolve(false), 2000);
                        });
                        if (!isAccessible) {
                            console.log(`❌ Image not accessible, clearing for ${data.username}`);
                            finalProfilePic = "";
                        }
                    }
                    console.log(`✅ Final profile pic for ${data.username}:`, finalProfilePic || 'NO IMAGE');
                    return {
                        username: data.username,
                        displayName: data.displayName || data.username,
                        profilePic: finalProfilePic,
                    };
                }
            }
        }
        catch (error) {
            console.error("Error loading user profile:", error);
        }
        // Return null for invalid/non-existent users
        return null;
    };
    // Fetch profile views for the current user
    const fetchProfileViews = async (userId) => {
        setError(null);
        try {
            console.log(`🔍 Fetching profile views for user: ${userId}`);
            const q = query(collection(db, "profileViews"), where("profileId", "==", userId), limit(100));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setViewData([]);
                return;
            }
            console.log(`📊 Found ${snapshot.docs.length} profile view entries`);
            const viewerMap = new Map();
            const invalidViewIds = []; // Track invalid entries for cleanup
            // Process view data and keep only the most recent view per viewer
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const viewerId = data.viewerId;
                if (!viewerId) {
                    console.log(`❌ Invalid entry without viewerId: ${docSnap.id}`);
                    invalidViewIds.push(docSnap.id);
                    continue;
                }
                let timestamp;
                try {
                    if (data.timestamp?.toDate) {
                        timestamp = data.timestamp.toDate();
                    }
                    else if (data.timestamp?.seconds) {
                        timestamp = data.timestamp.toDate();
                    }
                    else if (typeof data.timestamp === "string" || typeof data.timestamp === "number") {
                        timestamp = new Date(data.timestamp);
                    }
                    else if (data.viewedAt) {
                        timestamp = data.viewedAt instanceof Date ? data.viewedAt : new Date(data.viewedAt);
                    }
                    else {
                        timestamp = new Date();
                    }
                }
                catch (error) {
                    console.error("Error parsing timestamp:", error);
                    timestamp = new Date();
                }
                // Check if we already have a view from this user
                const existingView = viewerMap.get(viewerId);
                if (existingView && existingView.viewedAt > timestamp) {
                    console.log(`🔄 Found older duplicate for ${viewerId}, marking for cleanup`);
                    invalidViewIds.push(docSnap.id); // Mark older duplicate for cleanup
                    continue;
                }
                // Load viewer profile with fresh data
                console.log(`👤 Loading viewer profile for: ${viewerId}`);
                const viewerProfile = await loadUserProfile(viewerId);
                // Only add if we successfully loaded a valid profile
                if (viewerProfile) {
                    console.log(`✅ Valid viewer profile loaded: ${viewerProfile.username}`);
                    // Remove any existing older entry
                    if (existingView) {
                        console.log(`🔄 Replacing older entry for ${viewerId}`);
                        invalidViewIds.push(existingView.id);
                    }
                    viewerMap.set(viewerId, {
                        id: docSnap.id,
                        viewerId,
                        viewedAt: timestamp,
                        viewer: viewerProfile,
                    });
                }
                else {
                    console.log(`❌ Invalid viewer profile for ${viewerId}, marking for cleanup`);
                    // Mark invalid user entries for cleanup
                    invalidViewIds.push(docSnap.id);
                }
            }
            // Clean up invalid entries automatically (silent cleanup)
            if (invalidViewIds.length > 0) {
                console.log(`🧹 Auto-cleaning ${invalidViewIds.length} invalid profile view entries`);
                const deletePromises = invalidViewIds.map(id => deleteDoc(doc(db, "profileViews", id)).catch(err => console.error("Error deleting invalid view:", err)));
                await Promise.allSettled(deletePromises);
            }
            // Convert map to array and sort by most recent first
            const views = Array.from(viewerMap.values()).sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());
            console.log(`✅ Final processed views: ${views.length}`);
            views.forEach(view => {
                console.log(`👁️ View from: ${view.viewer.username} | Profile pic: ${view.viewer.profilePic || 'NO IMAGE'}`);
            });
            setViewData(views);
        }
        catch (err) {
            console.error("Error fetching profile views:", err);
            setError(err?.message || "Failed to load profile views.");
            setViewData([]);
        }
    };
    // Clean invalid profile views
    const cleanInvalidViews = async () => {
        if (!user?.uid || cleaning)
            return;
        if (!window.confirm("This will remove duplicate entries and profile views from users that no longer exist. Continue?")) {
            return;
        }
        setCleaning(true);
        try {
            const q = query(collection(db, "profileViews"), where("profileId", "==", user.uid), limit(200));
            const snapshot = await getDocs(q);
            let deletedCount = 0;
            const deletePromises = [];
            const seenViewers = new Map();
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const viewerId = data.viewerId;
                if (!viewerId) {
                    deletePromises.push(deleteDoc(docSnap.ref));
                    deletedCount++;
                    continue;
                }
                // Parse timestamp
                let timestamp;
                try {
                    if (data.timestamp?.toDate) {
                        timestamp = data.timestamp.toDate();
                    }
                    else if (data.timestamp?.seconds) {
                        timestamp = data.timestamp.toDate();
                    }
                    else {
                        timestamp = new Date(data.timestamp || 0);
                    }
                }
                catch {
                    timestamp = new Date(0);
                }
                // Check for duplicates
                const existing = seenViewers.get(viewerId);
                if (existing) {
                    if (timestamp > existing.timestamp) {
                        const oldDocRef = doc(db, "profileViews", existing.id);
                        deletePromises.push(deleteDoc(oldDocRef));
                        seenViewers.set(viewerId, { id: docSnap.id, timestamp });
                        deletedCount++;
                    }
                    else {
                        deletePromises.push(deleteDoc(docSnap.ref));
                        deletedCount++;
                    }
                    continue;
                }
                try {
                    const viewerDoc = await getDoc(doc(db, "users", viewerId));
                    if (!viewerDoc.exists()) {
                        deletePromises.push(deleteDoc(docSnap.ref));
                        deletedCount++;
                    }
                    else {
                        seenViewers.set(viewerId, { id: docSnap.id, timestamp });
                    }
                }
                catch (error) {
                    deletePromises.push(deleteDoc(docSnap.ref));
                    deletedCount++;
                }
            }
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                await fetchProfileViews(user.uid);
                alert(`✅ Cleaned up ${deletedCount} invalid/duplicate profile view entries.`);
            }
            else {
                alert("✅ No invalid entries found to clean up.");
            }
        }
        catch (error) {
            console.error("Error cleaning profile views:", error);
            alert("❌ Error cleaning profile views. Please try again.");
        }
        finally {
            setCleaning(false);
        }
    };
    // Auth and fetch logic
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchProfileViews(currentUser.uid);
            }
            else {
                navigate("/login");
            }
            setLoading(false);
        });
        return () => unsub();
    }, [navigate]);
    if (loading)
        return _jsx("div", { className: "p-4 text-center", children: "Loading..." });
    return (_jsxs("div", { className: "container mx-auto px-4 py-8 max-w-4xl bg-gray-900 min-h-screen", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Profile Viewers" }), _jsx("button", { onClick: cleanInvalidViews, disabled: cleaning || viewData.length === 0, className: "flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors duration-200", title: "Remove invalid profile view entries", children: cleaning ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" }), _jsx("span", { children: "Cleaning..." })] })) : (_jsxs(_Fragment, { children: [_jsx(TrashIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Clean Invalid" })] })) })] }), error && (_jsxs("div", { className: "bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-6 flex items-start", children: [_jsx(ExclamationTriangleIcon, { className: "h-6 w-6 text-yellow-400 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-yellow-200", children: "Unable to access profile view data" }), _jsx("p", { className: "text-sm text-yellow-300 mt-1", children: error })] })] })), viewData.length > 0 ? (_jsxs("div", { className: "bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700", children: [_jsxs("div", { className: "p-4 border-b border-gray-700", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Recent Profile Viewers" }), _jsxs("p", { className: "text-sm text-gray-400 mt-1", children: [viewData.length, " unique viewer", viewData.length !== 1 ? 's' : '', " found"] })] }), _jsx("ul", { className: "divide-y divide-gray-700", children: viewData.map((view) => (_jsxs("li", { className: "p-4 hover:bg-gray-750 flex items-center", children: [_jsx("div", { className: "flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-600 relative", children: view.viewer.profilePic ? (_jsx("img", { src: view.viewer.profilePic, alt: view.viewer.displayName, className: "h-full w-full object-cover", loading: "lazy", crossOrigin: "anonymous", referrerPolicy: "no-referrer", onError: (e) => {
                                            console.error(`❌ Profile image failed for ${view.viewer.username}:`, view.viewer.profilePic);
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent && !parent.querySelector('.fallback-initials')) {
                                                const fallbackDiv = document.createElement('div');
                                                fallbackDiv.className = 'fallback-initials h-full w-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-r from-purple-500 to-pink-500';
                                                fallbackDiv.textContent = (view.viewer.displayName || view.viewer.username || 'U').substring(0, 2).toUpperCase();
                                                parent.appendChild(fallbackDiv);
                                            }
                                        } })) : (_jsx("div", { className: "h-full w-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500", children: _jsx("span", { className: "text-white font-bold text-lg", children: (view.viewer.displayName || view.viewer.username || 'U').substring(0, 2).toUpperCase() }) })) }), _jsxs("div", { className: "ml-4 flex-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "font-medium text-white", children: view.viewer.displayName }), _jsxs("div", { className: "flex items-center text-sm text-gray-400", children: [_jsx(ClockIcon, { className: "h-4 w-4 mr-1" }), view.viewedAt instanceof Date && !isNaN(view.viewedAt.getTime())
                                                            ? `${view.viewedAt.toLocaleDateString()} at ${view.viewedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                                            : "Unknown time"] })] }), _jsxs("p", { className: "text-sm text-gray-400", children: ["@", view.viewer.username] })] })] }, view.id))) })] })) : (_jsx("div", { className: "bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 p-4 text-center", children: _jsx("p", { className: "text-gray-400", children: "No profile views found." }) }))] }));
};
export default ProfileViews;
