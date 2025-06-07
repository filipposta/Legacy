// Error types for better error handling
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'authentication',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
}

// Parse Firebase errors into more user-friendly formats
export function parseFirebaseError(error: any): AppError {
  const code = error?.code || '';
  const message = error?.message || 'An unknown error occurred';
  
  if (code.includes('permission-denied')) {
    return {
      type: ErrorType.PERMISSION, 
      message: 'You don\'t have permission to perform this action.',
      originalError: error
    };
  }
  
  if (code.includes('unauthenticated') || code.includes('auth/')) {
    return {
      type: ErrorType.AUTH,
      message: 'Please sign in to continue.',
      originalError: error
    };
  }
  
  if (code.includes('not-found')) {
    return {
      type: ErrorType.NOT_FOUND,
      message: 'The requested resource was not found.',
      originalError: error
    };
  }
  
  if (message.includes('network') || code.includes('unavailable')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network error. Please check your connection.',
      originalError: error
    };
  }
  
  return {
    type: ErrorType.UNKNOWN,
    message: 'Something went wrong. Please try again later.',
    originalError: error
  };
}

// Show a notification toast
export function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
  const notification = document.createElement('div');
  notification.className = `fixed top-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-[9999] text-base font-semibold transition-all duration-300 ${
    type === 'success' ? 'bg-green-500/80 text-white' :
    type === 'error' ? 'bg-red-500/80 text-white' :
    type === 'warning' ? 'bg-yellow-500/80 text-white' :
    'bg-blue-500/80 text-white'
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 400);
  }, 3000);
}

// Safe async function wrapper
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  errorHandler?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await asyncFn();
  } catch (error) {
    const appError = parseFirebaseError(error);
    console.error('Operation failed:', appError);
    
    if (errorHandler) {
      errorHandler(appError);
    } else {
      showNotification(appError.message, 'error');
    }
    
    return null;
  }
}
