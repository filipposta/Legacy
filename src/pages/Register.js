import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EyeIcon, EyeSlashIcon, UserIcon, EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { isUsernameAvailable } from "../utils/userUtils";
function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    // Validation function
    const validateForm = async () => {
        const newErrors = {};
        // Email validation
        if (!email.trim()) {
            newErrors.email = "Email is required";
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }
        // Username validation
        if (!username.trim()) {
            newErrors.username = "Username is required";
        }
        else if (username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }
        else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            newErrors.username = "Username can only contain letters, numbers, and underscores";
        }
        else {
            // Check username availability using our utility
            try {
                const available = await isUsernameAvailable(username);
                if (!available) {
                    newErrors.username = "Username is already taken";
                }
            }
            catch (error) {
                // Our utility already handles errors, this is just a fallback
                console.error("Error in username validation:", error);
                newErrors.username = "Could not verify username. Please try again."; // Added error message
            }
        }
        // Display name validation
        if (!displayName.trim()) {
            newErrors.displayName = "Display name is required";
        }
        else if (displayName.length < 2) {
            newErrors.displayName = "Display name must be at least 2 characters";
        }
        // Password validation
        if (!password) {
            newErrors.password = "Password is required";
        }
        else if (password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }
        // Confirm password validation
        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        }
        else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    // Add this helper function inside the Register component
    const generateUniqueUsername = (baseUsername) => {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
        return `${baseUsername}${randomSuffix}`;
    };
    const handleRegister = async (e) => {
        e.preventDefault();
        if (loading)
            return;
        // Validate form
        const isValid = await validateForm();
        if (!isValid) {
            // Focus on first error field
            const firstErrorField = Object.keys(errors)[0];
            const element = document.getElementById(firstErrorField);
            if (element) {
                element.focus();
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        setLoading(true);
        setErrors({});
        try {
            // Create Firebase user
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;
            // Create user profile in Firestore
            try {
                // Original username attempt
                let finalUsername = username.toLowerCase().trim();
                let userProfile = {
                    username: finalUsername,
                    displayName: displayName.trim(),
                    email: email.trim(),
                    bio: "",
                    profilePic: "",
                    backgroundUrl: "",
                    friends: [],
                    role: "user",
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                // Try to create the user profile
                try {
                    await setDoc(doc(db, "users", user.uid), userProfile);
                }
                catch (usernameError) {
                    // If there's an error that might be related to duplicate username
                    if (usernameError.code === 'already-exists' ||
                        usernameError.message?.includes('username') ||
                        usernameError.message?.includes('permission')) {
                        console.log("Username might be taken, generating alternative...");
                        // Generate a unique username with random suffix
                        finalUsername = generateUniqueUsername(username.toLowerCase().trim());
                        userProfile = {
                            ...userProfile,
                            username: finalUsername
                        };
                        // Try again with the new username
                        await setDoc(doc(db, "users", user.uid), userProfile);
                    }
                    else {
                        // If it's some other error, rethrow it
                        throw usernameError;
                    }
                }
                // Show success message
                const notification = document.createElement('div');
                notification.className = 'fixed top-6 right-6 bg-green-500/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300';
                // If we had to modify the username, let the user know
                if (finalUsername !== username.toLowerCase().trim()) {
                    notification.textContent = `✅ Account created! Your username is ${finalUsername} (original was taken)`;
                }
                else {
                    notification.textContent = '✅ Account created successfully! Welcome to Legacy!';
                }
                document.body.appendChild(notification);
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode)
                            notification.parentNode.removeChild(notification);
                    }, 400);
                }, 3000);
                // Navigate to posts
                navigate("/posts");
            }
            catch (firestoreError) {
                console.error("Error saving user profile:", firestoreError);
                // Check if error is due to duplicate username constraint
                if (firestoreError.code === 'already-exists' ||
                    firestoreError.message?.includes('username')) {
                    // Try to delete the auth account since profile creation failed
                    try {
                        await user.delete();
                    }
                    catch (deleteError) {
                        console.error("Could not delete auth user after profile creation failed:", deleteError);
                    }
                    setErrors({ username: "This username appears to be already taken. Please choose another." });
                    setLoading(false);
                    return;
                }
                // For other Firestore errors, show a generic message
                const notification = document.createElement('div');
                notification.className = 'fixed top-6 right-6 bg-red-500/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300';
                notification.textContent = `❌ Account created but profile setup failed. Please contact support.`;
                document.body.appendChild(notification);
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode)
                            notification.parentNode.removeChild(notification);
                    }, 400);
                }, 5000);
                // Navigate anyway - they'll need to set up their profile later
                navigate("/posts");
            }
        }
        catch (error) {
            console.error("Registration error:", error);
            let errorMessage = "Registration failed. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "An account with this email already exists. Please use a different email or try logging in.";
                setErrors({ email: errorMessage });
            }
            else if (error.code === 'auth/weak-password') {
                errorMessage = "Password is too weak. Please choose a stronger password.";
                setErrors({ password: errorMessage });
            }
            else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address. Please enter a valid email.";
                setErrors({ email: errorMessage });
            }
            else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = "Email/password accounts are not enabled. Please contact support.";
            }
            else if (error.code === 'auth/network-request-failed') {
                errorMessage = "Network error. Please check your internet connection and try again.";
            }
            else {
                errorMessage = error.message || "An unexpected error occurred. Please try again.";
            }
            // Show error notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-6 right-6 bg-red-500/80 text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300';
            notification.textContent = `❌ ${errorMessage}`;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode)
                        notification.parentNode.removeChild(notification);
                }, 400);
            }, 5000);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900", children: [_jsxs("div", { className: "absolute inset-0", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-black/60 backdrop-blur-[1px]" }), _jsx("div", { className: "absolute top-20 left-20 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75" }), _jsx("div", { className: "absolute top-40 right-32 w-2 h-2 bg-purple-500 rounded-full animate-pulse opacity-60" }), _jsx("div", { className: "absolute bottom-32 left-40 w-4 h-4 bg-pink-400 rounded-full animate-bounce opacity-50" }), _jsx("div", { className: "absolute top-60 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-40" }), _jsx("div", { className: "absolute bottom-20 right-20 w-3 h-3 bg-indigo-400 rounded-full animate-pulse opacity-70" })] }), _jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [_jsx("div", { className: "absolute top-1/4 left-0 w-72 h-72 bg-cyan-400/5 rounded-full mix-blend-multiply filter blur-xl animate-pulse" }), _jsx("div", { className: "absolute top-3/4 right-0 w-72 h-72 bg-purple-400/5 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-75" }), _jsx("div", { className: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/5 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-150" })] }), _jsx("div", { className: "relative z-10 flex items-center justify-center min-h-screen p-4", children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden", style: {
                        backdropFilter: 'blur(20px)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }, children: [_jsx("div", { className: "bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 p-8 text-center border-b border-white/10", children: _jsxs(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: 0.2 }, className: "space-y-4", children: [_jsx(UserIcon, { className: "h-16 w-16 text-cyan-400 mx-auto" }), _jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent", children: "Join Legacy" }), _jsx("p", { className: "text-gray-300", children: "Create your account and start connecting" })] }) }), Object.keys(errors).length > 0 && (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, className: "mx-8 mt-6 bg-red-500/20 border border-red-400/30 text-red-300 p-4 rounded-2xl backdrop-blur-xl", children: _jsx("div", { className: "flex items-center space-x-2", children: _jsx("span", { className: "text-sm font-medium", children: Object.values(errors)[0] }) }) })), _jsxs("div", { className: "p-8", children: [_jsxs("form", { onSubmit: handleRegister, className: "space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 }, className: "space-y-2", children: [_jsxs("label", { htmlFor: "email", className: "block text-white text-sm font-medium", children: [_jsx(EnvelopeIcon, { className: "w-4 h-4 inline mr-2" }), "Email Address"] }), _jsx("input", { id: "email", type: "email", placeholder: "Enter your email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", required: true }), errors.email && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.email })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 }, className: "space-y-2", children: [_jsxs("label", { htmlFor: "username", className: "block text-white text-sm font-medium", children: [_jsx(UserIcon, { className: "w-4 h-4 inline mr-2" }), "Username"] }), _jsx("input", { id: "username", type: "text", placeholder: "Choose a username", value: username, onChange: (e) => setUsername(e.target.value.toLowerCase()), className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", required: true }), errors.username && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.username })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.5 }, className: "space-y-2", children: [_jsxs("label", { htmlFor: "displayName", className: "block text-white text-sm font-medium", children: [_jsx(UserIcon, { className: "w-4 h-4 inline mr-2" }), "Display Name"] }), _jsx("input", { id: "displayName", type: "text", placeholder: "Your display name", value: displayName, onChange: (e) => setDisplayName(e.target.value), className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", required: true }), errors.displayName && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.displayName })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.6 }, className: "space-y-2", children: [_jsxs("label", { htmlFor: "password", className: "block text-white text-sm font-medium", children: [_jsx(LockClosedIcon, { className: "w-4 h-4 inline mr-2" }), "Password"] }), _jsxs("div", { className: "relative", children: [_jsx("input", { id: "password", type: showPassword ? "text" : "password", placeholder: "Create a password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", required: true }), _jsx("button", { type: "button", className: "absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors", onClick: () => setShowPassword(!showPassword), children: showPassword ? _jsx(EyeSlashIcon, { className: "w-5 h-5" }) : _jsx(EyeIcon, { className: "w-5 h-5" }) })] }), errors.password && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.password })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.7 }, className: "space-y-2", children: [_jsxs("label", { htmlFor: "confirmPassword", className: "block text-white text-sm font-medium", children: [_jsx(LockClosedIcon, { className: "w-4 h-4 inline mr-2" }), "Confirm Password"] }), _jsxs("div", { className: "relative", children: [_jsx("input", { id: "confirmPassword", type: showConfirmPassword ? "text" : "password", placeholder: "Confirm your password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", required: true }), _jsx("button", { type: "button", className: "absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors", onClick: () => setShowConfirmPassword(!showConfirmPassword), children: showConfirmPassword ? _jsx(EyeSlashIcon, { className: "w-5 h-5" }) : _jsx(EyeIcon, { className: "w-5 h-5" }) })] }), errors.confirmPassword && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.confirmPassword })] }), _jsx(motion.button, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.8 }, type: "submit", disabled: loading, className: "w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-2xl hover:scale-[1.02] hover:shadow-cyan-500/25", children: loading ? (_jsxs("div", { className: "flex items-center justify-center space-x-3", children: [_jsx("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Creating Account..." })] })) : (_jsxs("span", { className: "flex items-center justify-center space-x-2", children: [_jsx("span", { children: "Create Account" }), _jsx(ArrowRightIcon, { className: "h-5 w-5" })] })) })] }), _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.9 }, className: "text-center mt-8", children: _jsxs("p", { className: "text-gray-300", children: ["Already have an account?", " ", _jsx(Link, { to: "/login", className: "text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text font-bold hover:from-cyan-300 hover:to-purple-400 transition-all duration-300 underline", children: "Sign in here" })] }) })] })] }) }), _jsx("style", { children: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      ` })] }));
}
export default Register;
