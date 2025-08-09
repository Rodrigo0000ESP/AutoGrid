console.log('Forgot password script loaded');

function showError(message) {
  console.log('Showing error:', message);
  const messageDiv = document.getElementById('forgotPasswordMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = 'text-red-600 text-sm mt-2';
    messageDiv.style.display = 'block';
  } else {
    console.error('Message div not found');
  }
}

function showSuccess(message) {
  console.log('Showing success:', message);
  const messageDiv = document.getElementById('forgotPasswordMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = 'text-green-600 text-sm mt-2';
    messageDiv.style.display = 'block';
  } else {
    console.error('Message div not found');
  }
}

function initForgotPassword() {
  console.log('Initializing forgot password form...');
  const form = document.getElementById('forgotPasswordForm');
  const submitBtn = document.getElementById('forgotPasswordSubmit');

  if (!form) {
    console.error('Forgot password form not found (forgotPasswordForm)');
    return;
  }

  if (!submitBtn) {
    console.error('Submit button not found (forgotPasswordSubmit)');
    return;
  }
  
  console.log('Form found, adding submit listener...');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    // Clear previous messages
    showError('');
    
    // Get form data
    const formData = new FormData(form);
    const email = formData.get('email')?.trim() || '';
    
    console.log('Form values:', { email });
    
    // Basic validation
    if (!email) {
      const errorMsg = 'Please enter your email address';
      console.error('Validation error:', errorMsg);
      showError(errorMsg);
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
      Sending...
    `;
    
    try {
      console.log('Sending password reset request...');
      // Call forgot password API
      const response = await fetch('http://localhost:8000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to send recovery email. Please try again.';
        try {
          const errorData = await response.json();
          console.error('Forgot password error response:', errorData);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Password reset email sent successfully');
      
      // Show success message
      showSuccess('Recovery email sent! Please check your inbox for further instructions.');
      form.reset();
      
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.message || 'An error occurred while processing your request';
      console.error('Error details:', errorMessage);
      showError(errorMessage);
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send recovery link';
    }
  });
  
  console.log('Forgot password form initialization complete');
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForgotPassword);
} else {
  initForgotPassword();
}

// Also listen for Astro's page load event
document.addEventListener('astro:page-load', initForgotPassword);
