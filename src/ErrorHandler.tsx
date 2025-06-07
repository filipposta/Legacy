import React, { useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

const ErrorHandler: React.FC<Props> = ({ children }) => {
  useEffect(() => {
    // Original console methods
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    // Override console.warn to filter out BloomFilter warnings
    console.warn = (...args) => {
      // Check if the warning is related to BloomFilter
      if (args[0] && (
          (typeof args[0] === 'string' && args[0].includes('BloomFilter')) ||
          (args[0] instanceof Error && args[0].name === 'BloomFilterError') ||
          (args[0] && typeof args[0] === 'object' && args[0].name === 'BloomFilterError')
      )) {
        // Silently ignore BloomFilter warnings
        return;
      }
      
      // Pass through all other warnings
      originalConsoleWarn.apply(console, args);
    };
    
    // Override console.error to filter out BloomFilter errors
    console.error = (...args) => {
      // Check if the error is related to BloomFilter
      if (args[0] && (
          (typeof args[0] === 'string' && args[0].includes('BloomFilter')) ||
          (args[0] instanceof Error && args[0].name === 'BloomFilterError') ||
          (args[0] && typeof args[0] === 'object' && args[0].name === 'BloomFilterError')
      )) {
        // Silently ignore BloomFilter errors
        return;
      }
      
      // Pass through all other errors
      originalConsoleError.apply(console, args);
    };
    
    // Add global unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && 
          ((event.reason.name === 'BloomFilterError') || 
           (typeof event.reason.message === 'string' && event.reason.message.includes('BloomFilter')))) {
        // Prevent the default browser behavior (showing an error)
        event.preventDefault();
        return;
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      // Restore original console methods on unmount
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
};

export default ErrorHandler;
