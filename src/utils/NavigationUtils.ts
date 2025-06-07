/**
 * Utility functions for handling navigation with proper authentication state
 */

/**
 * Navigate to a route with proper authentication state handling
 * This function uses window.location.href for a full page reload
 * which ensures Firebase auth state is correctly initialized
 */
export const navigateWithAuth = (path: string, authenticated: boolean = false) => {
  // Set authentication state in storage before navigation
  if (authenticated) {
    localStorage.setItem('userAuthenticated', 'true')
    sessionStorage.setItem('authStatus', 'authenticated')
  }
  
  // Force a full page reload by using window.location
  window.location.href = path
  return true
}

/**
 * Navigate to login page with a redirect path
 */
export const navigateToLogin = (redirectPath?: string) => {
  // Clear any existing auth state
  localStorage.removeItem('userAuthenticated')
  sessionStorage.removeItem('authStatus')
  
  // Store the path to redirect to after login
  if (redirectPath) {
    sessionStorage.setItem('authRedirect', redirectPath)
  }
  
  window.location.href = '/login'
  return true
}

/**
 * Check if there's a redirect path after login and navigate there
 */
export const checkAndHandleAuthRedirect = () => {
  const redirectPath = sessionStorage.getItem('authRedirect')
  if (redirectPath) {
    sessionStorage.removeItem('authRedirect')
    navigateWithAuth(redirectPath, true)
    return true
  }
  return false
}
