import { onSnapshot as originalOnSnapshot } from 'firebase/firestore';
// Create a wrapped version of onSnapshot that handles permission errors
export function safeOnSnapshot(query, observer, options) {
    // Handle both onSnapshot(query, callback) and onSnapshot(query, observer) patterns
    const nextFn = typeof observer === 'function' ? observer : observer.next;
    const errorFn = typeof observer === 'function' ? undefined : observer.error;
    const completeFn = typeof observer === 'function' ? undefined : observer.complete;
    // Create a safe error handler that prevents uncaught exceptions
    const safeErrorHandler = (error) => {
        console.warn('[Firebase] Snapshot listener error caught:', error);
        if (error?.code === 'permission-denied') {
            console.warn('[Firebase] Permission denied in snapshot listener. This is likely due to Firestore security rules.');
            // Call user-provided error handler if it exists
            if (errorFn) {
                try {
                    errorFn(error);
                }
                catch (e) {
                    console.error('[Firebase] Error in user error handler:', e);
                }
            }
            // Return early to prevent uncaught error
            return;
        }
        // For other errors, call user error handler or log
        if (errorFn) {
            try {
                errorFn(error);
            }
            catch (e) {
                console.error('[Firebase] Error in user error handler:', e);
            }
        }
        else {
            console.error('[Firebase] Unhandled snapshot error:', error);
        }
    };
    // Create observer object with our safe error handler
    const safeObserver = typeof observer === 'function'
        ? { next: nextFn, error: safeErrorHandler }
        : {
            next: nextFn,
            error: safeErrorHandler,
            complete: completeFn
        };
    // Call original onSnapshot with our safe observer
    try {
        return originalOnSnapshot(query, safeObserver, options);
    }
    catch (err) {
        console.error('[Firebase] Error setting up snapshot listener:', err);
        // Return a no-op unsubscribe function
        return () => { };
    }
}
