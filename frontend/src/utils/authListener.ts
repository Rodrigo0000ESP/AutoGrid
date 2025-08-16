import { isAuthenticated, logout } from '../services/authService';

export function setupAuthListener() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Check auth status on initial load
  checkAuthStatus();

  // Listen for storage events (in case of logout from another tab)
  window.addEventListener('storage', (event) => {
    if (event.key === 'autogrid_token' && !event.newValue) {
      // Token was removed in another tab
      handleLogout();
    }
  });

  // Listen for Astro page navigation events
  document.addEventListener('astro:page-load', checkAuthStatus);
}

function checkAuthStatus() {
  // Skip for login/register pages to prevent redirect loops
  if (['/login', '/register', '/forgot-password'].includes(window.location.pathname)) {
    return;
  }

  if (!isAuthenticated()) {
    handleLogout();
  }
}

function handleLogout() {
  // Clear any existing timeouts to prevent multiple executions
  clearTimeout((window as any).logoutTimer);
  
  // Perform any necessary cleanup here
  // For example: clear tokens, reset user state, etc.
  console.log('Logging out...');
  
  // Optional: You can add any post-logout logic here
  // without redirecting the user
}

// Export a function to manually trigger auth check
export function checkAuthentication() {
  if (!isAuthenticated()) {
    handleLogout();
    return false;
  }
  return true;
}
