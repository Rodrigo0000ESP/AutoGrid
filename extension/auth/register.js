import { register } from '../Data/DataShareService.js';

const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('registerMessage');

// Unifies logic for both forms (login and register)
document.querySelectorAll('#forgotPasswordLink').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Password recovery functionality coming soon.');
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Clear any previous messages
  messageDiv.textContent = '';
  messageDiv.className = '';
  messageDiv.style.display = 'none';
  
  // Get field values
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (password !== confirmPassword) {
    messageDiv.textContent = 'Passwords do not match';
    messageDiv.className = 'message error';
    messageDiv.style.display = 'block';
    return;
  }

  try {
    await register({ username, email, password });
    messageDiv.textContent = 'Registration successful! Redirecting to home page...';
    messageDiv.className = 'message success';
    messageDiv.style.display = 'block';
    form.reset();
    setTimeout(() => {
      window.location.href = '../home/home.html';
    }, 1200);
  } catch (err) {
    messageDiv.textContent = err.message || 'Error during registration';
    messageDiv.className = 'message error';
    messageDiv.style.display = 'block';
  }
});
