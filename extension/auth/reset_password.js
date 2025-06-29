import { resetPassword } from "../Data/DataShareService.js";

document.addEventListener("DOMContentLoaded", function () {
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const messageElement = document.getElementById("resetPasswordMessage");
    const loginLink = document.getElementById("loginLink");
    const tokenInput = document.getElementById("tokenInput");
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // If there's no token, show an error message
    if (!token) {
        messageElement.textContent = "Invalid or expired reset link";
        messageElement.className = "message error";
        resetPasswordForm.style.display = "none";
        return;
    }
    
    // Set the token in the form
    tokenInput.value = token;
    
    resetPasswordForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const password = resetPasswordForm.password.value;
        const confirmPassword = resetPasswordForm.confirmPassword.value;
        
        // Validate that passwords match
        if (password !== confirmPassword) {
            messageElement.textContent = "Passwords do not match";
            messageElement.className = "message error";
            return;
        }
        
        messageElement.textContent = "";
        messageElement.className = "message";
        
        try {
            // Show loading indicator
            const submitButton = resetPasswordForm.querySelector("button[type='submit']");
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = "Saving...";
            
            const response = await resetPassword(token, password);
            
            // Show success message
            messageElement.textContent = response.message;
            messageElement.className = "message success";
            
            // Hide the form and show the login link
            resetPasswordForm.style.display = "none";
            loginLink.style.display = "block";
            
        } catch (error) {
            // Show error message
            messageElement.textContent = error.message || "Invalid or expired token";
            messageElement.className = "message error";
        } finally {
            // Restore the button
            const submitButton = resetPasswordForm.querySelector("button[type='submit']");
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
});
