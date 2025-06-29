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
        errorDiv.textContent = "";
        const username = form.elements["username"]?.value.trim() || "";
        const password = form.elements["password"]?.value.trim() || "";

        if (!username || !password) {
            errorDiv.textContent = "Please complete username and password.";
            errorDiv.style.color = "red";
            return;
        }

        try {
            await login({ username, password });
            window.location.href = "../home/home.html";
        } catch (err) {
            errorDiv.textContent = err.message || "Login failed. Please try again.";
            errorDiv.style.color = "red";
        }
    });
});
