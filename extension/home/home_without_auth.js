import { isLoggedIn, logout, saveJobOffer } from "../Data/DataShareService.js";


document.addEventListener("DOMContentLoaded", function () {
    const app = document.getElementById("app");
    let saveBtn = null;
    async function handleSaveOffer() {
        if (isLoggedIn()) {
            try {
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
                
                // Mostrar mensaje de carga
                showMessage("Saving job offer...", "info");
                
                // Guardar la oferta con el HTML de la página
                await saveJobOffer({ title, url });
                
                // Mostrar mensaje de éxito
                showMessage("✓ Offer saved successfully", "success");
            } catch (error) {
                console.error("Error saving job offer:", error);
                showMessage(`Error: ${error.message || "Could not save the offer"}`, "error");
            }
        } else {
            alert("You must log in to save offers.");
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
        
        const container = document.querySelector('.container');
        container.appendChild(message);
        
        setTimeout(() => { message.style.opacity = '1'; }, 10);
        
        // Solo desaparece automáticamente si es éxito o info
        if (type === "success" || type === "info") {
            setTimeout(() => { 
                message.style.opacity = '0'; 
                setTimeout(() => message.remove(), 300);
            }, 2000);
        }
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
                <p>Log in to save your favorite offers or register for free.</p>
                <div class="button-group">
                    <button id="loginBtn">Log in</button>
                    <button id="registerBtn">Create account</button>
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