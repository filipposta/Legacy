import React, { Component, ErrorInfo, ReactNode } from 'react';
import { handleFirestoreConnectionError } from './utils/NetworkErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false
  };

  // Catch errors in any child components
  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Attempt recovery for network errors
    if (error.message && (
      error.message.includes('QUIC_PROTOCOL_ERROR') ||
      error.message.includes('WebChannel') ||
      error.message.includes('firestore.googleapis.com') ||
      error.message.includes('status of 400')
    )) {
      this.setState({ isRecovering: true });
      
      // Attempt to recover from connection issues
      handleFirestoreConnectionError(error)
        .then(recovered => {
          if (recovered) {
            // Reset error state after recovery
            setTimeout(() => {
              this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                isRecovering: false
              });
            }, 2000);
          } else {
            this.setState({ isRecovering: false });
          }
        })
        .catch(() => {
          this.setState({ isRecovering: false });
        });
    }
  }

  // Try again button handler
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      // Default fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900">
          <div className="max-w-md w-full p-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
              
              {this.state.isRecovering ? (
                <div className="text-gray-300 mb-4">
                  <p className="mb-2">Attempting to recover from the error...</p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-300 mb-4">
                    There was a problem loading this page. Try refreshing or going back.
                  </p>
                  <div className="text-left p-3 bg-gray-800/50 rounded-lg mb-4 overflow-auto max-h-32 text-xs text-gray-400">
                    {this.state.error?.toString()}
                  </div>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={this.handleReset}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Refresh Page
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
