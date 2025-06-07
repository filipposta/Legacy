import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { UserIcon, ArrowLeftIcon, CalendarIcon, MapPinIcon, LinkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
function ViewProfile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    // Get initials helper
    const getInitials = (name) => {
        if (!name)
            return "U";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    // Get role badge
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
    // Get nationality flag
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
    // Record profile view
    const recordProfileView = async (profileId) => {
        if (!currentUser || currentUser.uid === profileId)
            return;
        try {
            await addDoc(collection(db, "profileViews"), {
                profileId: profileId,
                viewerId: currentUser.uid,
                timestamp: serverTimestamp(),
                viewedAt: new Date()
            });
            console.log("Profile view recorded successfully");
        }
        catch (error) {
            console.error("Error recording profile view:", error);
        }
    };
    // Load user data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);
    // Fetch user profile
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!username) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Find user by username
                const usersRef = collection(db, "users");
                const snapshot = await getDocs(usersRef);
                let userDoc = null;
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    if (data.username === username) {
                        userDoc = { id: doc.id, ...data };
                        break;
                    }
                }
                if (!userDoc) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }
                // Check privacy settings
                const profilePrivacy = userDoc.privacy || 'public';
                if (profilePrivacy === 'private') {
                    if (!currentUser || currentUser.uid !== userDoc.id) {
                        setAccessDenied(true);
                        setLoading(false);
                        return;
                    }
                }
                else if (profilePrivacy === 'friends') {
                    if (!currentUser || currentUser.uid !== userDoc.id) {
                        // Check if users are friends
                        const currentUserDoc = await getDoc(doc(db, "users", currentUser?.uid || ""));
                        if (currentUserDoc.exists()) {
                            const currentUserData = currentUserDoc.data();
                            const currentUserFriends = currentUserData.friends || [];
                            const profileUserFriends = userDoc.friends || [];
                            const isFriend = currentUserFriends.includes(userDoc.id) ||
                                profileUserFriends.includes(currentUser?.uid);
                            if (!isFriend) {
                                setAccessDenied(true);
                                setLoading(false);
                                return;
                            }
                        }
                        else {
                            setAccessDenied(true);
                            setLoading(false);
                            return;
                        }
                    }
                }
                setUserData(userDoc);
                // Record profile view if not own profile
                if (currentUser && currentUser.uid !== userDoc.id) {
                    await recordProfileView(userDoc.id);
                }
            }
            catch (error) {
                console.error("Error fetching user profile:", error);
                setNotFound(true);
            }
            finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, [username, currentUser]);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" }), _jsx("div", { className: "text-white text-xl", children: "Loading profile..." })] }) }));
    }
    if (notFound) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900", children: _jsxs("div", { className: "text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20", children: [_jsx(UserIcon, { className: "h-16 w-16 text-gray-400 mx-auto mb-4" }), _jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "Profile Not Found" }), _jsx("p", { className: "text-gray-300 mb-6", children: "The user you're looking for doesn't exist." }), _jsx("button", { onClick: () => navigate('/posts'), className: "bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors", children: "Back to Posts" })] }) }));
    }
    if (accessDenied) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900", children: _jsxs("div", { className: "text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20", children: [_jsx(ShieldCheckIcon, { className: "h-16 w-16 text-red-400 mx-auto mb-4" }), _jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "Access Denied" }), _jsx("p", { className: "text-gray-300 mb-6", children: "This profile is private or restricted to friends only." }), _jsxs("div", { className: "flex space-x-4 justify-center", children: [_jsx("button", { onClick: () => navigate('/posts'), className: "bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors", children: "Back to Posts" }), !currentUser && (_jsx("button", { onClick: () => navigate('/login'), className: "bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors", children: "Sign In" }))] })] }) }));
    }
    if (!userData)
        return null;
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900", children: [_jsx("div", { className: "p-4", children: _jsxs("button", { onClick: () => navigate(-1), className: "flex items-center space-x-2 text-white hover:text-gray-300 transition-colors", children: [_jsx(ArrowLeftIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Back" })] }) }), _jsxs("div", { className: "max-w-4xl mx-auto px-4 pb-20", children: [_jsxs("div", { className: "relative", children: [userData.backgroundUrl && (_jsx("div", { className: "h-64 bg-cover bg-center rounded-t-2xl", style: { backgroundImage: `url(${userData.backgroundUrl})` }, children: _jsx("div", { className: "h-full bg-black/50 rounded-t-2xl" }) })), _jsx("div", { className: `bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8 ${userData.backgroundUrl ? '-mt-32 relative z-10' : ''}`, children: _jsxs("div", { className: "flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userData.profilePic ? (_jsx("img", { src: userData.profilePic, alt: "Profile", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "text-white text-3xl font-bold", children: getInitials(userData.displayName || userData.username) })) }), userData.isAdult && (_jsx("div", { className: "absolute -bottom-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg", children: "18+" }))] }), _jsxs("div", { className: "flex-1 text-center md:text-left", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4", children: [_jsx("h1", { className: "text-3xl font-bold text-white", children: userData.displayName || userData.username }), getRoleBadge(userData.role), userData.isAdult && (_jsxs("div", { className: "flex items-center space-x-1 bg-red-600 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg", children: [_jsx(ShieldCheckIcon, { className: "h-3 w-3" }), _jsx("span", { children: "18+" })] }))] }), _jsxs("p", { className: "text-gray-300 text-lg mb-4", children: ["@", userData.username] }), userData.bio && (_jsx("p", { className: "text-gray-200 mb-6 max-w-2xl", children: userData.bio })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm", children: [userData.location && (_jsxs("div", { className: "flex items-center space-x-2 text-gray-300", children: [_jsx(MapPinIcon, { className: "h-4 w-4" }), _jsx("span", { children: userData.location })] })), userData.website && (_jsxs("div", { className: "flex items-center space-x-2 text-gray-300", children: [_jsx(LinkIcon, { className: "h-4 w-4" }), _jsx("a", { href: userData.website, target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:text-blue-300 transition-colors", children: userData.website })] })), userData.joinedAt && (_jsxs("div", { className: "flex items-center space-x-2 text-gray-300", children: [_jsx(CalendarIcon, { className: "h-4 w-4" }), _jsxs("span", { children: ["Joined ", new Date(userData.joinedAt.seconds * 1000).toLocaleDateString()] })] })), userData.nationality && (_jsxs("div", { className: "flex items-center space-x-2 text-gray-300", children: [_jsx("span", { className: "text-xl", children: getNationalityFlag(userData.nationality) }), _jsx("span", { children: userData.nationality.toUpperCase() })] })), userData.age && (_jsx("div", { className: "flex items-center space-x-2 text-gray-300", children: _jsxs("span", { children: [userData.age, " years old"] }) }))] }), _jsx("div", { className: "mt-6 flex justify-center md:justify-start", children: _jsx("div", { className: "bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full", children: _jsxs("span", { className: "text-white font-medium", children: [userData.friends?.length || 0, " Friends"] }) }) })] })] }) })] }), _jsxs("div", { className: "mt-8 flex justify-center space-x-4", children: [_jsx("button", { onClick: () => navigate(`/user/${userData.username}`), className: "bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg", children: "View Full Profile" }), _jsx("button", { onClick: () => navigate('/posts'), className: "bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-medium transition-colors", children: "Back to Posts" })] })] })] }));
}
export default ViewProfile;
