import { register } from '../Data/DataShareService.js';

const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('registerMessage');

// Unifica lógica para ambos forms (login y register)
document.querySelectorAll('#forgotPasswordLink').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Funcionalidad de recuperación de contraseña próximamente.');
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageDiv.textContent = '';
  messageDiv.className = 'message';
  if (password !== confirmPassword) {
    registerErrorDiv.textContent = 'Passwords do not match';
    registerErrorDiv.style.color = "#e63946";
    return;
  }

  try {
    await register({ username, email, password });
    registerErrorDiv.textContent = '¡Registro exitoso! Redirigiendo a la página principal...';
    registerErrorDiv.style.color = "#2ecc71";
    form.reset();
    setTimeout(() => {
      window.location.href = '../home/home.html';
    }, 1200);
  } catch (err) {
    registerErrorDiv.textContent = err.message || 'Error during registration';
    registerErrorDiv.style.color = "#e63946";
  }
});
