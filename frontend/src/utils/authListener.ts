import { isAuthenticated } from '../services/authService';

export function setupAuthListener() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Check auth status on initial load
  checkAuthStatus();

  // Listen for storage events (in case of logout from another tab)
  window.addEventListener('storage', (event) => {
    if (event.key === 'autogrid_token') {
      // Token added or removed in another tab
      checkAuthStatus();
    }
  });

  // Listen for Astro page navigation events
  document.addEventListener('astro:page-load', checkAuthStatus);
}

function checkAuthStatus() {
  const path = window.location.pathname;
  // Public pages (exact matches)
  const publicPaths = new Set([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/check-email',
    '/verify-email',
    '/pricing',
    '/support',
    '/how-it-works',
    '/subscription/success',
    '/subscription/canceled',
  ]);
  // Protected sections (prefix matches)
  const protectedPrefixes = ['/dashboard', '/jobs', '/plan_details', '/subscription', '/account'];

  const isPublic = publicPaths.has(path);
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (isPublic) return; // Never redirect on public pages

  if (isProtected && !isAuthenticated()) {
    // Redirect unauthenticated users trying to access protected pages
    window.location.href = '/login';
  }
}

function handleLogout() {
  // If user becomes unauthenticated while on a protected page, send to login
  const path = window.location.pathname;
  const protectedPrefixes = ['/dashboard', '/jobs', '/plan_details', '/subscription', '/account'];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));
  if (isProtected) {
    window.location.href = '/login';
  }
}

// Export a function to manually trigger auth check
export function checkAuthentication() {
  if (!isAuthenticated()) {
    handleLogout();
    return false;
  }
  return true;
}
