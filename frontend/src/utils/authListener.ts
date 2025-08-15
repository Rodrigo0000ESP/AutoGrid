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
  // Don't redirect if already on login or logout pages
  if (['/login', '/logout'].includes(window.location.pathname)) return;
  
  // Clear any existing timeouts to prevent multiple redirects
  clearTimeout((window as any).logoutTimer);
  
  // Use a small delay to allow any other operations to complete
  (window as any).logoutTimer = setTimeout(() => {
    // Redirect to logout page which will handle the cleanup
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/logout?returnUrl=${returnUrl}`;
  }, 100);
}

// Export a function to manually trigger auth check
export function checkAuthentication() {
  if (!isAuthenticated()) {
    handleLogout();
    return false;
  }
  return true;
}
