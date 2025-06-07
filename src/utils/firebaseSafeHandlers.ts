import { onSnapshot, Query, DocumentReference } from 'firebase/firestore';

/**
 * Safe wrapper around onSnapshot that handles permission errors
 */
export function safeOnSnapshot<T>(
  query: Query<T> | DocumentReference<T>,
  observerOrNext: any,
  error?: (error: Error) => void,
  complete?: () => void
) {
  // Handle different call signatures
  const isObserverObject = typeof observerOrNext === 'object';
  
  // Prepare error handler
  const safeErrorHandler = (err: Error) => {
    console.warn('[Firebase] Error in snapshot listener:', err);
    
    // Handle permission denied errors specifically
    if (err?.['code'] === 'permission-denied') {
      console.warn('[Firebase] Permission denied in snapshot - disabling listener');
      return; // Don't propagate to avoid uncaught exceptions
    }
    
    // Call original error handler if it exists
    if (isObserverObject && observerOrNext.error) {
      try {
        observerOrNext.error(err);
      } catch (handlerError) {
        console.error('[Firebase] Error in user error handler:', handlerError);
      }
    } else if (error) {
      try {
        error(err);
      } catch (handlerError) {
        console.error('[Firebase] Error in user error handler:', handlerError);
      }
    } else {
      // If no handler provided, don't throw the error to prevent app crashes
      console.error('[Firebase] Unhandled snapshot error:', err);
    }
  };
  
  try {
    if (isObserverObject) {
      // Case: onSnapshot(query, { next, error, complete })
      const safeObserver = {
        next: observerOrNext.next,
        error: safeErrorHandler,
        complete: observerOrNext.complete
      };
      return onSnapshot(query, safeObserver);
    } else {
      // Case: onSnapshot(query, next, error, complete)
      return onSnapshot(
        query,
        observerOrNext,
        safeErrorHandler,
        complete
      );
    }
  } catch (err) {
    console.error('[Firebase] Error setting up snapshot listener:', err);
    safeErrorHandler(err as Error);
    // Return a no-op unsubscribe function
    return () => {};
  }
}
