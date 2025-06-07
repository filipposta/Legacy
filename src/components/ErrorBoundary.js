import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.handleRefresh = () => {
            window.location.reload();
        };
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error, errorInfo: null };
    }
    componentDidCatch(error, errorInfo) {
        // You can log the error to an error reporting service here
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900", children: _jsxs("div", { className: "bg-black/40 backdrop-blur-sm p-6 md:p-8 rounded-xl max-w-md w-full border border-white/10 text-center", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-14 w-14 mx-auto text-red-500 mb-4", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }), _jsx("h2", { className: "text-xl md:text-2xl font-bold text-white mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-gray-300 mb-6", children: "There was an error adding a friend to the group. Let's try again." }), _jsx("button", { onClick: this.handleRefresh, className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors", children: "Refresh Page" }), process.env.NODE_ENV === 'development' && this.state.error && (_jsxs("div", { className: "mt-6 p-4 bg-black/40 rounded-lg text-left border border-red-500/30 overflow-auto max-h-60", children: [_jsx("p", { className: "text-sm font-semibold text-red-400", children: "Error Details:" }), _jsx("p", { className: "text-xs text-white mt-2", children: this.state.error.toString() }), this.state.errorInfo && (_jsx("pre", { className: "text-xs text-gray-400 mt-2 whitespace-pre-wrap", children: this.state.errorInfo.componentStack }))] }))] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
