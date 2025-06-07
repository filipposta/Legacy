import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
function ProfileView() {
    const navigate = useNavigate();
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center", children: _jsxs("div", { className: "bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/30 shadow-xl max-w-md w-full", children: [_jsx("h1", { className: "text-3xl font-bold text-white mb-4", children: "Profile View" }), _jsx("p", { className: "text-gray-200 mb-6", children: "This feature is currently under development. Please check back later." }), _jsx("div", { className: "flex justify-center", children: _jsx("button", { onClick: () => navigate('/dashboard'), className: "px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors", children: "Back to Dashboard" }) })] }) }));
}
export default ProfileView;
