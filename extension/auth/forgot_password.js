import { forgotPassword } from "../Data/DataShareService.js";

document.addEventListener("DOMContentLoaded", function () {
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    const messageElement = document.getElementById("forgotPasswordMessage");

    forgotPasswordForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const email = forgotPasswordForm.email.value;
        messageElement.textContent = "";
        messageElement.className = "message";
        
        try {
            // Show loading indicator
            const submitButton = forgotPasswordForm.querySelector("button[type='submit']");
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = "Sending...";
            
            const response = await forgotPassword(email);
            
            // Show success message
            messageElement.textContent = response.message;
            messageElement.className = "message success";
            
            forgotPasswordForm.reset();
        } catch (error) {
            // Show error message
            messageElement.textContent = error.message;
            messageElement.className = "message error";
        } finally {
            // Restore the button
            const submitButton = forgotPasswordForm.querySelector("button[type='submit']");
            submitButton.disabled = false;
            submitButton.textContent = "Send link";
        }
    });
});
