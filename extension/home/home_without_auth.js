import { isLoggedIn, logout } from "../Data/DataShareService.js";


document.addEventListener("DOMContentLoaded", function () {
    const app = document.getElementById("app");
    let guardarBtn = null;
    function simulateGuardarOferta() {
        if (isLoggedIn()) {
            const message = document.createElement('div');
            message.className = 'message success';
            message.textContent = "✓ Oferta guardada correctamente";
            message.style.opacity = '0';
            message.style.transition = 'opacity 0.3s';
            
            const container = document.querySelector('.container');
            container.appendChild(message);
            
            setTimeout(() => { message.style.opacity = '1'; }, 10);
            setTimeout(() => { 
                message.style.opacity = '0'; 
                setTimeout(() => message.remove(), 300);
            }, 2000);
        } else {
            alert("Debes iniciar sesión para guardar ofertas.");
        }
    }
    if (isLoggedIn()) {
        app.innerHTML = `
            <div class="menu-autenticado">
                <h1>AutoGrid</h1>
                <p>¡Bienvenido! Guarda tus ofertas favoritas con un solo clic.</p>
                <button id="guardarBtn">Guardar oferta</button>
                <div>
                    <button id="logoutBtn">Cerrar sesión</button>
                </div>
                <div>
                    <a href="#" id="configShortcutLink">Configurar atajo de teclado</a>
                    <span id="shortcutDisplay"></span>
                </div>
            </div>
        `;
        document.getElementById("logoutBtn").onclick = () => {
            logout();
            location.reload();
        };
        guardarBtn = document.getElementById("guardarBtn");
        guardarBtn.onclick = simulateGuardarOferta;
        // Mostrar instrucciones para configurar shortcut global
        document.getElementById('shortcutDisplay').textContent = '(Configura en ajustes)';
        // Enlace abre la configuración de shortcuts del navegador
        document.getElementById('configShortcutLink').onclick = (e) => {
            e.preventDefault();
            alert('Para configurar el atajo global:\n1. Abre chrome://extensions/shortcuts\n2. Busca AutoGrid\n3. Configura tu atajo preferido');
        };

    } else {
        app.innerHTML = `
            <div class="menu-invitado">
                <h1>AutoGrid</h1>
                <p>Accede para guardar tus ofertas favoritas o regístrate gratis.</p>
                <div class="button-group">
                    <button id="loginBtn">Iniciar sesión</button>
                    <button id="registerBtn">Crear cuenta</button>
                </div>
            </div>
        `;
        document.getElementById("loginBtn").onclick = () => {
            window.location.href = "../auth/login.html";
        };
        document.getElementById("registerBtn").onclick = () => {
            window.location.href = "../auth/register.html";
        };
    }
});