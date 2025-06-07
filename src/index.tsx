import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ChatProvider } from './chat/ChatContext'
import ErrorHandler from './ErrorHandler';
import ErrorBoundary from './ErrorBoundary';
import { setupNetworkErrorInterceptor, startConnectionMonitoring } from './utils/NetworkErrorHandler';
import { BrowserRouter } from 'react-router-dom';

// Setup network error interception early
setupNetworkErrorInterceptor();
// Start connection monitoring
const stopConnectionMonitoring = startConnectionMonitoring();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorHandler>
      <ErrorBoundary>
        <BrowserRouter>
          <ChatProvider>
            <App />
          </ChatProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ErrorHandler>
  </React.StrictMode>
);

// Clean up connection monitoring on unload
window.addEventListener('beforeunload', () => {
  stopConnectionMonitoring();
});