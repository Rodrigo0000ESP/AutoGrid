console.log('Register script loaded');

function showError(message) {
  console.log('Showing error:', message);
  const errorDiv = document.getElementById('registerError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.className = 'error-message';
    errorDiv.style.display = 'block';
  } else {
    console.error('Error div not found');
  }
}

function showSuccess(message) {
  console.log('Showing success:', message);
  const errorDiv = document.getElementById('registerError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.className = 'success-message';
    errorDiv.style.display = 'block';
  }
}

// Register form handling
function initRegister() {
  console.log('Initializing register form...');
  const form = document.getElementById('registerForm');
  const submitBtn = document.getElementById('registerSubmit');

  if (!form) {
    console.error('Register form not found (registerForm)');
    return;
  }
  
  if (!submitBtn) {
    console.error('Submit button not found (registerSubmit)');
    return;
  }
  
  console.log('Form found, adding submit listener...');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    // Clear any previous errors
    showError('');
    
    // Get form values
    const username = form.elements['username']?.value.trim() || '';
    const email = form.elements['email']?.value.trim() || '';
    const password = form.elements['password']?.value || '';
    const confirmPassword = form.elements['confirmPassword']?.value || '';
    const terms = form.elements['terms']?.checked || false;
    
    console.log('Form values:', { username, email, password: '***', confirmPassword: '***', terms });
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      const errorMsg = 'Please fill in all required fields';
      console.error('Validation error:', errorMsg);
      showError(errorMsg);
      return;
    }
    
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      console.error('Validation error:', errorMsg);
      showError(errorMsg);
      return;
    }
    
    if (!terms) {
      showError('You must agree to the terms and conditions');
      return;
    }
    
    // Save original button text and update UI for loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" 
           xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Creating account...
    `;
    
    try {
      console.log('Sending registration request...');
      // Call register API
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Registration failed. Please try again.';
        try {
          const errorData = await response.json();
          console.error('Registration error response:', errorData);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Registration successful, received data:', { token: data.token ? '***' : 'No token' });
      
      // Store the token in localStorage if available
      if (data.token) {
        localStorage.setItem('autogrid_token', data.token);
        
        // Show success message
        showSuccess('Registration successful! Redirecting to dashboard...');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        throw new Error('No authentication token received');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'An error occurred during registration. Please try again.';
      console.error('Error details:', errorMessage);
      showError(errorMessage);
      
      // Reset button state on error
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
  
  console.log('Register form initialization complete');
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegister);
} else {
  initRegister();
}

// Also listen for Astro's page load event
document.addEventListener('astro:page-load', initRegister);
