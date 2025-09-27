import { login } from "../Data/DataShareService.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const errorDiv = document.getElementById("loginError");

    if (!form) {
        console.error("Login form not found (loginForm)");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Clear any previous errors
        errorDiv.textContent = "";
        errorDiv.style.display = "none";
        errorDiv.className = "";
        
        const username = form.elements["username"]?.value.trim() || "";
        const password = form.elements["password"]?.value.trim() || "";

        if (!username || !password) {
            errorDiv.textContent = "Please complete username/email and password.";
            errorDiv.className = "message error";
            errorDiv.style.display = "block";
            return;
        }

        try {
            await login({ username, password });
            // No need to show any message on success, just redirect
            window.location.href = "../home/home.html";
        } catch (err) {
            errorDiv.textContent = err.message || "Login failed. Please try again.";
            errorDiv.className = "message error";
            errorDiv.style.display = "block";
        }
    });
});
