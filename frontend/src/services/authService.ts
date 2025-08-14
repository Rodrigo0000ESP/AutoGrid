// Auth token key for localStorage
const AUTH_TOKEN_KEY = 'autogrid_token';

/**
 * Get the authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
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
  }
};

/**
 * Check if user is authenticated by verifying the token exists
 * The actual token validation will be done by the backend when making requests
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') {
    console.log('isAuthenticated: Not in browser environment');
    return false;
  }
  
  const token = getAuthToken();
  console.log('isAuthenticated - Token from storage:', token ? `[exists, length: ${token.length}]` : 'null/undefined');
  
  const isValid = !!token && token.length > 10;
  console.log('isAuthenticated - Token validation result:', isValid);
  
  return isValid;
};
