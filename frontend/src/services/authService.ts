// Auth token key for localStorage
const AUTH_TOKEN_KEY = 'autogrid_token';

/**
 * Get the authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(AUTH_TOKEN_KEY) : null)
  );
};

/**
 * Set the authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

/**
 * Remove the authentication token from localStorage
 */
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
};

/**
 * Check if user is authenticated by verifying the token exists and is not expired
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') {
    console.log('isAuthenticated: Not in browser environment');
    return false;
  }
  
  const token = getAuthToken();
  
  if (!token || token.length < 10) {
    console.log('isAuthenticated: No valid token found');
    return false;
  }
  
  try {
    // Decode the JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    
    if (isExpired) {
      console.log('isAuthenticated: Token has expired');
      // Remove expired token
      removeAuthToken();
      return false;
    }
    
    console.log('isAuthenticated: Valid token found');
    return true;
    
  } catch (error) {
    console.error('Error validating token:', error);
    // If there's an error decoding the token, remove it
    removeAuthToken();
    return false;
  }
};

/**
 * Logout the current user by removing the auth token and any related data
 */
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    // Remove auth token
    removeAuthToken();
    
    // Clear any other user-related data from localStorage if needed
    // Example: localStorage.removeItem('user_data');
    
    // Force a full page reload to reset the application state
    window.location.href = '/';
  }
};
