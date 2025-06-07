/**
 * Utility for managing Firebase listeners across the application
 */
const listeners = new Map();
/**
 * Register a new Firebase listener
 * @param id - Unique identifier for this listener
 * @param unsubscribeFunction - Function to call to unsubscribe from the listener
 */
export const registerListener = (id, unsubscribeFunction) => {
    // Unsubscribe from any existing listener with the same ID
    if (listeners.has(id)) {
        listeners.get(id)?.();
    }
    listeners.set(id, unsubscribeFunction);
};
/**
 * Unregister a specific Firebase listener
 * @param id - Identifier of the listener to unregister
 */
export const unregisterListener = (id) => {
    if (listeners.has(id)) {
        listeners.get(id)?.();
        listeners.delete(id);
    }
};
/**
 * Unregister all Firebase listeners
 */
export const unregisterAllListeners = () => {
    listeners.forEach((unsubscribe) => {
        try {
            unsubscribe();
        }
        catch (error) {
            console.error("Error unsubscribing from listener:", error);
        }
    });
    listeners.clear();
};
/**
 * Get the count of active listeners
 */
export const getActiveListenerCount = () => {
    return listeners.size;
};
