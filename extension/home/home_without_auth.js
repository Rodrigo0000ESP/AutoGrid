import { isLoggedIn, logout } from "../Data/DataShareService.js";


document.addEventListener("DOMContentLoaded", function () {
    const app = document.getElementById("app");
    let saveBtn = null;
    function simulateSaveOffer() {
        if (isLoggedIn()) {
            const message = document.createElement('div');
            message.className = 'message success';
            message.textContent = "✓ Offer saved successfully";
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
            alert("You must log in to save offers.");
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
        saveBtn.onclick = simulateSaveOffer;
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