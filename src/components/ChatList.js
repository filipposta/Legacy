import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { HomeIcon, UserIcon, DocumentTextIcon, ArrowRightOnRectangleIcon, CogIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
const Navbar = () => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                    }
                }
                catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            }
            else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        }
        catch (error) {
            console.error('Error signing out:', error);
        }
    };
    const getInitials = (name) => {
        if (!name)
            return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    if (loading) {
        return (_jsx("nav", { className: "bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx("div", { className: "text-white text-xl font-bold", children: "ScySocial" }) }), _jsx("div", { className: "flex items-center", children: _jsx("div", { className: "animate-pulse bg-white/20 h-8 w-20 rounded" }) })] }) }) }));
    }
    if (!user) {
        return (_jsx("nav", { className: "bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex justify-between h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx(Link, { to: "/", className: "text-white text-xl font-bold hover:text-cyan-400 transition-colors", children: "ScySocial" }) }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx(Link, { to: "/login", className: "text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: "Sign In" }), _jsx(Link, { to: "/register", className: "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors", children: "Sign Up" })] })] }) }) }));
    }
    return (_jsx("nav", { className: "bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "flex justify-between h-16", children: [_jsx("div", { className: "flex items-center", children: _jsx(Link, { to: "/dashboard", className: "text-white text-xl font-bold hover:text-cyan-400 transition-colors", children: "ScySocial" }) }), _jsxs("div", { className: "hidden md:flex items-center space-x-6", children: [_jsxs(Link, { to: "/dashboard", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(HomeIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Dashboard" })] }), _jsxs(Link, { to: "/profile", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(UserIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Profile" })] }), _jsxs(Link, { to: "/posts", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(DocumentTextIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Posts" })] }), _jsxs(Link, { to: "/settings", className: "flex items-center space-x-1 text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(CogIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Settings" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs(Link, { to: "/profile", className: "flex items-center space-x-2 hover:opacity-80 transition-opacity", children: [_jsx("div", { className: "w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover rounded-full" })) : (_jsx("span", { className: "text-white font-semibold text-xs", children: getInitials(userProfile?.displayName || userProfile?.username || "U") })) }), _jsx("span", { className: "text-white text-sm font-medium", children: userProfile?.displayName || userProfile?.username || 'User' })] }), _jsxs("button", { onClick: handleSignOut, className: "flex items-center space-x-1 text-white hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-colors", children: [_jsx(ArrowRightOnRectangleIcon, { className: "h-4 w-4" }), _jsx("span", { children: "Sign Out" })] })] })] }), _jsxs("div", { className: "md:hidden flex items-center space-x-3", children: [_jsx(Link, { to: "/profile", className: "flex items-center", children: _jsx("div", { className: "w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover rounded-full" })) : (_jsx("span", { className: "text-white font-semibold text-xs", children: getInitials(userProfile?.displayName || userProfile?.username || "U") })) }) }), _jsx("button", { onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: "text-white hover:text-cyan-400 p-2 rounded-md transition-colors", children: mobileMenuOpen ? (_jsx(XMarkIcon, { className: "h-6 w-6" })) : (_jsx(Bars3Icon, { className: "h-6 w-6" })) })] })] }), mobileMenuOpen && (_jsx("div", { className: "md:hidden", children: _jsxs("div", { className: "px-2 pt-2 pb-3 space-y-1 bg-white/10 backdrop-blur-lg rounded-b-lg border-t border-white/20", children: [_jsxs(Link, { to: "/dashboard", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(HomeIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Dashboard" })] }), _jsxs(Link, { to: "/profile", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(UserIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Profile" })] }), _jsxs(Link, { to: "/posts", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(DocumentTextIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Posts" })] }), _jsxs(Link, { to: "/settings", onClick: () => setMobileMenuOpen(false), className: "flex items-center space-x-3 text-white hover:text-cyan-400 hover:bg-white/10 px-3 py-3 rounded-md text-base font-medium transition-colors", children: [_jsx(CogIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Settings" })] }), _jsxs("div", { className: "border-t border-white/20 pt-3", children: [_jsxs("div", { className: "flex items-center space-x-3 px-3 py-2", children: [_jsx("div", { className: "w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center", children: userProfile?.profilePic ? (_jsx("img", { src: userProfile.profilePic, alt: "Profile", className: "w-full h-full object-cover rounded-full" })) : (_jsx("span", { className: "text-white font-semibold text-sm", children: getInitials(userProfile?.displayName || userProfile?.username || "U") })) }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-white font-medium", children: userProfile?.displayName || userProfile?.username || 'User' }), _jsxs("div", { className: "text-gray-300 text-sm", children: ["@", userProfile?.username || 'user'] })] })] }), _jsxs("button", { onClick: () => {
                                            handleSignOut();
                                            setMobileMenuOpen(false);
                                        }, className: "flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-3 rounded-md text-base font-medium transition-colors w-full", children: [_jsx(ArrowRightOnRectangleIcon, { className: "h-5 w-5" }), _jsx("span", { children: "Sign Out" })] })] })] }) }))] }) }));
};
export default Navbar;
