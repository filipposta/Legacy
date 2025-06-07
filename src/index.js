import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChatProvider } from './chat/ChatContext';
import ErrorHandler from './ErrorHandler';
import ErrorBoundary from './ErrorBoundary';
import { setupNetworkErrorInterceptor, startConnectionMonitoring } from './utils/NetworkErrorHandler';
import { BrowserRouter } from 'react-router-dom';
// Setup network error interception early
setupNetworkErrorInterceptor();
// Start connection monitoring
const stopConnectionMonitoring = startConnectionMonitoring();
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(_jsx(React.StrictMode, { children: _jsx(ErrorHandler, { children: _jsx(ErrorBoundary, { children: _jsx(BrowserRouter, { children: _jsx(ChatProvider, { children: _jsx(App, {}) }) }) }) }) }));
// Clean up connection monitoring on unload
window.addEventListener('beforeunload', () => {
    stopConnectionMonitoring();
});
