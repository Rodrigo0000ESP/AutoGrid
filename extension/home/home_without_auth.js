import { isLoggedIn, logout, saveJobOffer } from "../Data/DataShareService.js";


document.addEventListener("DOMContentLoaded", function () {
    const app = document.getElementById("app");
    let saveBtn = null;
    async function handleSaveOffer() {
        if (isLoggedIn()) {
            try {
                // Mostrar mensaje de procesando inmediatamente
                showMessage("🔄 Preparing job offer...", "info");
                
                // Deshabilitar el botón para evitar múltiples clics
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.textContent = "Processing...";
                }
                
                // Obtener la pestaña activa
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (!tabs || tabs.length === 0) {
                    showMessage("No active tab found", "error");
                    return;
                }
                
                const activeTab = tabs[0];
                
                // Obtener título y URL de la pestaña activa
                const title = activeTab.title || "";
                const url = activeTab.url || "";
                
                // Actualizar mensaje cuando se envía al servidor
                showMessage("📤 Job offer sent to server. You can safely close this extension now.", "info");
                
                // Guardar la oferta con el HTML de la página
                await saveJobOffer({ title, url });
                
                // Mostrar mensaje de éxito
                showMessage("✅ Job offer processed and saved successfully!", "success");
            } catch (error) {
                console.error("Error saving job offer:", error);
                
                // Si la sesión expiró, redirigir al login automáticamente
                if (error.message === "SESSION_EXPIRED") {
                    window.location.href = "../auth/login.html";
                    return;
                }
                
                showMessage(`Error: ${error.message || "Could not save the offer"}`, "error");
            } finally {
                // Rehabilitar el botón siempre
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save offer";
                }
            }
        } else {
            // Si no está logueado, redirigir al login directamente
            window.location.href = "../auth/login.html";
        }
    }
    
    function showMessage(text, type = "success") {
        // Eliminar mensajes anteriores
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.3s';
        
        // Agregar al body para que position: fixed funcione correctamente
        document.body.appendChild(message);
        
        setTimeout(() => { message.style.opacity = '1'; }, 10);
        
        // Solo desaparece automáticamente si es éxito
        if (type === "success") {
            setTimeout(() => { 
                message.style.opacity = '0'; 
                setTimeout(() => message.remove(), 300);
            }, 2000);
        }
        // Los mensajes de info (procesando) y error se mantienen hasta ser reemplazados
    }
    if (isLoggedIn()) {
        app.innerHTML = `
            <div class="menu-authenticated">
                <h1>AutoGrid</h1>
                <p>Welcome! Save your favorite offers with a single click.</p>
                <button id="saveBtn">Save offer</button>
                <div>
                    <button id="logoutBtn">Log out</button>
                </div>
                <div>
                    <a href="#" id="configShortcutLink">Configure keyboard shortcut</a>
                    <span id="shortcutDisplay"></span>
                </div>
            </div>
        `;
        document.getElementById("logoutBtn").onclick = () => {
            logout();
            location.reload();
        };
        saveBtn = document.getElementById("saveBtn");
        saveBtn.onclick = handleSaveOffer;
        // Show instructions for configuring global shortcut
        document.getElementById('shortcutDisplay').textContent = '(Configure in settings)';
        // Link opens browser shortcuts configuration
        document.getElementById('configShortcutLink').onclick = (e) => {
            e.preventDefault();
            alert('To configure the global shortcut:\n1. Open chrome://extensions/shortcuts\n2. Find AutoGrid\n3. Configure your preferred shortcut');
        };

    } else {
        app.innerHTML = `
            <div class="menu-guest">
                <h1>AutoGrid</h1>
                <p>Log in to save your favorite offers.</p>
                <div class="button-group">
                    <button id="loginBtn">Log in</button>
                </div>
            </div>
        `;
        document.getElementById("loginBtn").onclick = () => {
            window.location.href = "../auth/login.html";
        };
    }
});