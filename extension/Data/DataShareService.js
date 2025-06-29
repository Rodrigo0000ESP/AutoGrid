const API_URL = "http://localhost:8000";

/**
 * Saves a job offer in the backend.
 * @param {Object} offer - { title, url }
 * @returns {Promise<Object>} - Backend response
 */
export async function saveJobOffer({ title, url }) {
    const token = localStorage.getItem("autogrid_token");
    if (!token) throw new Error("Not authenticated");
    const response = await fetch(`${API_URL}/jobs/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, url })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error saving offer");
    }
    return await response.json();
}

export async function register({ username, email, password }) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error registering user");
    }
    const data = await response.json();
    localStorage.setItem("autogrid_token", data.token);
    return data.user;
}

export async function login({ username, password }) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error logging in");
    }
    const data = await response.json();
    localStorage.setItem("autogrid_token", data.token);
    return data.user;
}

export function logout() {
    localStorage.removeItem("autogrid_token");
}

export function isLoggedIn() {
    return !!localStorage.getItem("autogrid_token");
}

/**
 * Requests a password reset for the provided email
 * @param {string} email - User's email
 * @returns {Promise<Object>} - Backend response
 */
export async function forgotPassword(email) {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error requesting password reset");
    }
    return await response.json();
}

/**
 * Resets the password using a token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Backend response
 */
export async function resetPassword(token, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error resetting password");
    }
    return await response.json();
}
export function saveJob() {
    
}
    