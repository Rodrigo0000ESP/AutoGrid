console.log('Login script loaded');

// Login form handling
function initLogin() {
  console.log('Initializing login form...');
  
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmit');

  if (!form) {
    console.error('Login form not found (loginForm)');
    return;
  }

  console.log('Form found, adding submit listener...');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    // Clear any previous errors
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
      errorDiv.className = '';
    }
    
    // Get form values
    const username = form.elements['username']?.value.trim() || '';
    const password = form.elements['password']?.value.trim() || '';
    const rememberMe = form.elements['remember-me']?.checked || false;
    
    console.log('Form values:', { username, password: '***', rememberMe });
    
    // Basic validation
    if (!username || !password) {
      const errorMsg = 'Please enter both username and password';
      console.error('Validation error:', errorMsg);
      showError(errorMsg);
      return;
    }
    
    // Update button to show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" 
           xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Signing in...
    `;
    
    try {
      console.log('Sending login request...');
      // Call login API
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Login failed. Please check your credentials.';
        try {
          const errorData = await response.json();
          console.error('Login error response:', errorData);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Login successful, received data:', { token: data.token ? '***' : 'No token' });
      
      // Store the token in localStorage
      if (data.token) {
        localStorage.setItem('autogrid_token', data.token);
        
        // Handle remember me if needed
        if (rememberMe) {
          // Set a cookie that expires in 30 days
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          document.cookie = `autogrid_token=${data.token}; expires=${expiryDate.toUTCString()}; path=/`;
        }
        
        console.log('Redirecting to home page...');
        // Redirect to home page
        window.location.href = '/';
      } else {
        throw new Error('No authentication token received');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'An error occurred during login. Please try again.';
      console.error('Error details:', errorMessage);
      showError(errorMessage);
      
      // Reset button state on error
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
  
  console.log('Login form initialization complete');
}

function showError(message) {
  console.log('Showing error:', message);
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.className = 'error-message';
    errorDiv.style.display = 'block';
  } else {
    console.error('Error div not found');
  }
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}

// Also listen for Astro's page load event
document.addEventListener('astro:page-load', initLogin);
