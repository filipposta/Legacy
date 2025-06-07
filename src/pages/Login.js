import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, XCircleIcon, CheckCircleIcon, ArrowRightIcon, KeyIcon } from '@heroicons/react/24/outline';
function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const navigate = useNavigate();
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            // Set auth status before attempting login to prevent UI flicker
            localStorage.setItem('userAuthenticated', 'true');
            sessionStorage.setItem('authStatus', 'authenticated');
            await signInWithEmailAndPassword(auth, email, password);
            // Force navigation with page reload to ensure proper authentication state
            window.location.href = "/posts";
        }
        catch (err) {
            // Clear auth status on failure
            localStorage.removeItem('userAuthenticated');
            sessionStorage.removeItem('authStatus');
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email address");
            }
            else if (err.code === 'auth/wrong-password') {
                setError("Incorrect password");
            }
            else if (err.code === 'auth/invalid-email') {
                setError("Invalid email address");
            }
            else if (err.code === 'auth/too-many-requests') {
                setError("Too many failed attempts. Please try again later");
            }
            else {
                setError(err.message || "Failed to login");
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail) {
            setError("Please enter your email address");
            return;
        }
        setResetLoading(true);
        setError("");
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetEmailSent(true);
        }
        catch (err) {
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email address");
            }
            else if (err.code === 'auth/invalid-email') {
                setError("Invalid email address");
            }
            else {
                setError(err.message || "Failed to send reset email");
            }
        }
        finally {
            setResetLoading(false);
        }
    };
    const handleBackToLogin = () => {
        setShowForgotPassword(false);
        setResetEmailSent(false);
        setError("");
        setResetEmail("");
    };
    // Add new direct navigation handler
    const handleNavigateToRegister = (e) => {
        e.preventDefault();
        // Use direct window location change to force page reload
        window.location.href = "/register";
    };
    return (_jsxs("div", { className: "min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900", children: [_jsxs("div", { className: "absolute inset-0", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-black/60 backdrop-blur-[1px]" }), _jsx("div", { className: "absolute top-20 left-20 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75" }), _jsx("div", { className: "absolute top-40 right-32 w-2 h-2 bg-purple-500 rounded-full animate-pulse opacity-60" }), _jsx("div", { className: "absolute bottom-32 left-40 w-4 h-4 bg-pink-400 rounded-full animate-bounce opacity-50" }), _jsx("div", { className: "absolute top-60 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-40" }), _jsx("div", { className: "absolute bottom-20 right-20 w-3 h-3 bg-indigo-400 rounded-full animate-pulse opacity-70" })] }), _jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [_jsx("div", { className: "absolute top-1/4 left-0 w-72 h-72 bg-cyan-400/5 rounded-full mix-blend-multiply filter blur-xl animate-pulse" }), _jsx("div", { className: "absolute top-3/4 right-0 w-72 h-72 bg-purple-400/5 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-75" }), _jsx("div", { className: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/5 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-150" })] }), _jsx("div", { className: "relative z-10 flex items-center justify-center min-h-screen p-4", children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden", style: {
                        backdropFilter: 'blur(20px)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }, children: [_jsx("div", { className: "bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 p-8 text-center border-b border-white/10", children: _jsx(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: 0.2 }, className: "space-y-4", children: showForgotPassword ? (resetEmailSent ? (_jsxs(_Fragment, { children: [_jsx(CheckCircleIcon, { className: "h-16 w-16 text-green-400 mx-auto" }), _jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent", children: "Check Your Email" }), _jsx("p", { className: "text-gray-300", children: "We've sent password reset instructions to your email" })] })) : (_jsxs(_Fragment, { children: [_jsx(KeyIcon, { className: "h-16 w-16 text-purple-400 mx-auto" }), _jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent", children: "Forgot Password" }), _jsx("p", { className: "text-gray-300", children: "Enter your email to receive reset instructions" })] }))) : (_jsxs(_Fragment, { children: [_jsx(LockClosedIcon, { className: "h-16 w-16 text-cyan-400 mx-auto" }), _jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent", children: "Welcome Back" }), _jsx("p", { className: "text-gray-300", children: "Sign in to your account" })] })) }) }), error && (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, className: "mx-8 mt-6 bg-red-500/20 border border-red-400/30 text-red-300 p-4 rounded-2xl backdrop-blur-xl", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(XCircleIcon, { className: "h-5 w-5 flex-shrink-0" }), _jsx("span", { className: "text-sm font-medium", children: error })] }) })), _jsxs("div", { className: "p-8", children: [showForgotPassword ? (resetEmailSent ? (
                                /* Reset Email Sent Success */
                                _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "space-y-6 text-center", children: [_jsxs("div", { className: "bg-green-500/10 border border-green-400/30 rounded-2xl p-6", children: [_jsx(CheckCircleIcon, { className: "h-12 w-12 text-green-400 mx-auto mb-4" }), _jsx("h3", { className: "text-green-300 font-semibold text-lg mb-2", children: "Email Sent Successfully!" }), _jsxs("p", { className: "text-green-200 text-sm leading-relaxed", children: ["We've sent password reset instructions to ", _jsx("strong", { children: resetEmail }), ". Please check your inbox and follow the instructions to reset your password."] })] }), _jsxs("div", { className: "bg-blue-500/10 border border-blue-400/30 rounded-2xl p-4", children: [_jsx("h4", { className: "text-blue-300 font-semibold text-sm mb-2", children: "\uD83D\uDCE7 Email Tips:" }), _jsxs("ul", { className: "text-blue-200 text-xs space-y-1 text-left", children: [_jsx("li", { children: "\u2022 Check your spam/junk folder if you don't see it" }), _jsx("li", { children: "\u2022 The link will expire in 24 hours" }), _jsx("li", { children: "\u2022 You can request a new email if needed" })] })] }), _jsx("button", { onClick: handleBackToLogin, className: "w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-2xl hover:scale-[1.02]", children: "Back to Login" })] })) : (
                                /* Forgot Password Form */
                                _jsxs("form", { onSubmit: handleForgotPassword, className: "space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 }, className: "space-y-2", children: [_jsxs("label", { className: "block text-white text-sm font-medium", children: [_jsx(EnvelopeIcon, { className: "w-4 h-4 inline mr-2" }), "Email Address"] }), _jsx("input", { type: "email", placeholder: "Enter your email address", className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300", value: resetEmail, onChange: (e) => setResetEmail(e.target.value), required: true })] }), _jsx(motion.button, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 }, type: "submit", disabled: resetLoading, className: "w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-2xl hover:scale-[1.02]", children: resetLoading ? (_jsxs("div", { className: "flex items-center justify-center space-x-3", children: [_jsx("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Sending Reset Email..." })] })) : (_jsxs("span", { className: "flex items-center justify-center space-x-2", children: [_jsx("span", { children: "Send Reset Email" }), _jsx(ArrowRightIcon, { className: "h-5 w-5" })] })) }), _jsx(motion.button, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.5 }, type: "button", onClick: handleBackToLogin, className: "w-full text-gray-300 hover:text-white transition-colors text-sm underline", children: "Back to Login" })] }))) : (
                                /* Login Form */
                                _jsxs("form", { onSubmit: handleLogin, className: "space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 }, className: "space-y-2", children: [_jsxs("label", { className: "block text-white text-sm font-medium", children: [_jsx(EnvelopeIcon, { className: "w-4 h-4 inline mr-2" }), "Email Address"] }), _jsx("input", { type: "email", placeholder: "Enter your email", className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 }, className: "space-y-2", children: [_jsxs("label", { className: "block text-white text-sm font-medium", children: [_jsx(LockClosedIcon, { className: "w-4 h-4 inline mr-2" }), "Password"] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? "text" : "password", placeholder: "Enter your password", className: "w-full p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300", value: password, onChange: (e) => setPassword(e.target.value), required: true }), _jsx("button", { type: "button", className: "absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors", onClick: () => setShowPassword(!showPassword), children: showPassword ? _jsx(EyeSlashIcon, { className: "w-5 h-5" }) : _jsx(EyeIcon, { className: "w-5 h-5" }) })] })] }), _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.5 }, className: "text-right", children: _jsx("button", { type: "button", onClick: () => setShowForgotPassword(true), className: "text-cyan-400 hover:text-cyan-300 text-sm transition-colors underline", children: "Forgot your password?" }) }), _jsx(motion.button, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.6 }, type: "submit", disabled: loading, className: "w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-2xl hover:scale-[1.02] hover:shadow-cyan-500/25", onClick: (e) => {
                                                if (!loading) {
                                                    handleLogin(e);
                                                }
                                            }, children: loading ? (_jsxs("div", { className: "flex items-center justify-center space-x-3", children: [_jsx("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Signing In..." })] })) : (_jsxs("span", { className: "flex items-center justify-center space-x-2", children: [_jsx("span", { children: "Sign In" }), _jsx(ArrowRightIcon, { className: "h-5 w-5" })] })) })] })), !showForgotPassword && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.7 }, className: "text-center mt-8", children: _jsxs("p", { className: "text-gray-300", children: ["Don't have an account?", " ", _jsx("button", { onClick: handleNavigateToRegister, className: "text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text font-bold hover:from-cyan-300 hover:to-purple-400 transition-all duration-300 underline", children: "Create one now" })] }) }))] })] }) }), _jsx("style", { children: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      ` })] }));
}
export default Login;
