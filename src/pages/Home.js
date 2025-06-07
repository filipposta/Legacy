import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
// Change back to named import and ensure we're importing from the .ts file
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
function Home() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        // Use auth directly
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    const features = [
        {
            icon: "🚀",
            title: "Premium Social Experience",
            description: "Connect with friends in a completely new way with our advanced social features."
        },
        {
            icon: "💬",
            title: "Real-time Chat",
            description: "Instant messaging with emojis, images, and group conversations."
        },
        {
            icon: "👥",
            title: "Friend Network",
            description: "Build your social circle and discover new connections."
        },
        {
            icon: "🎨",
            title: "Customizable Profiles",
            description: "Express yourself with personalized profiles and backgrounds."
        },
        {
            icon: "🔒",
            title: "Secure & Private",
            description: "Your data is protected with enterprise-grade security."
        },
        {
            icon: "📱",
            title: "Mobile Optimized",
            description: "Perfect experience across all your devices."
        }
    ];
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900", children: _jsx("div", { className: "text-white text-xl", children: "Loading..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-x-hidden", children: [_jsx("nav", { className: "fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10", children: _jsx("div", { className: "max-w-7xl mx-auto px-2 sm:px-4 lg:px-8", children: _jsxs("div", { className: "flex justify-between items-center h-20 sm:h-24 lg:h-28", children: [_jsxs("div", { className: "flex items-center space-x-2 sm:space-x-3 lg:space-x-4", children: [_jsx("img", { src: logo, alt: "Legacy Logo", className: "h-16 sm:h-20 lg:h-24 w-auto object-contain" }), _jsx("span", { className: "bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 rounded-full text-xs sm:text-sm lg:text-base font-bold", children: "PREMIUM" })] }), _jsx("div", { className: "flex items-center space-x-2 sm:space-x-3 lg:space-x-4", children: user ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => navigate("/posts"), className: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm lg:text-base", children: "Posts" }), _jsx("button", { onClick: () => navigate("/profile"), className: "border border-white/30 hover:bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm lg:text-base", children: "Profile" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => navigate("/login"), className: "border border-white/30 hover:bg-white/10 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm lg:text-base", children: "Sign In" }), _jsx("button", { onClick: () => navigate("/register"), className: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm lg:text-base", children: "Get Started" })] })) })] }) }) }), _jsx("section", { className: "pt-24 sm:pt-28 lg:pt-36 pb-16 sm:pb-20 px-4", children: _jsxs("div", { className: "max-w-7xl mx-auto text-center", children: [_jsx("div", { className: "mb-6 sm:mb-8", children: _jsxs("span", { className: "inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-medium mb-6 sm:mb-8", children: [_jsx("span", { className: "w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full mr-2 animate-pulse" }), "Premium Social Platform"] }) }), _jsxs("h1", { className: "text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6", children: [_jsx("span", { className: "bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent", children: "Welcome to the Future" }), _jsx("br", {}), _jsx("span", { className: "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent", children: "of Social Connection" })] }), _jsx("p", { className: "text-base sm:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4", children: "Experience social networking like never before with Legacy Premium. Connect, chat, and share in a beautiful, secure environment." }), _jsx("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4", children: !user ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => navigate("/register"), className: "w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25", children: "Start Your Journey" }), _jsx("button", { onClick: () => navigate("/login"), className: "w-full sm:w-auto border-2 border-white/30 hover:bg-white/10 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200", children: "Sign In" })] })) : (_jsx("button", { onClick: () => navigate("/posts"), className: "w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25", children: "Go to Posts" })) })] }) }), _jsx("section", { className: "py-16 sm:py-20 px-4", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "text-center mb-12 sm:mb-16", children: [_jsx("h2", { className: "text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6", children: _jsx("span", { className: "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent", children: "Premium Features" }) }), _jsx("p", { className: "text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto px-4", children: "Discover what makes Legacy the ultimate social platform" })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8", children: features.map((feature, index) => (_jsxs("div", { className: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10", children: [_jsx("div", { className: "text-3xl sm:text-4xl mb-3 sm:mb-4", children: feature.icon }), _jsx("h3", { className: "text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white", children: feature.title }), _jsx("p", { className: "text-sm sm:text-base text-gray-300 leading-relaxed", children: feature.description })] }, index))) })] }) }), _jsx("footer", { className: "py-8 sm:py-12 px-4 border-t border-white/10", children: _jsxs("div", { className: "max-w-7xl mx-auto text-center", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4", children: [_jsx("img", { src: logo, alt: "Legacy Logo", className: "h-14 sm:h-18 lg:h-20 w-auto object-contain" }), _jsx("span", { className: "bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-bold", children: "PREMIUM" })] }), _jsx("p", { className: "text-sm sm:text-base text-gray-400", children: "\u00A9 2025 Legacy Premium. All rights reserved." })] }) })] }));
}
export default Home;
