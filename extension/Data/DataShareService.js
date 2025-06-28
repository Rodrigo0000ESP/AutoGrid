const API_URL = "http://localhost:8000";

/**
 * Guarda una oferta de trabajo en el backend.
 * @param {Object} oferta - { titulo, url }
 * @returns {Promise<Object>} - Respuesta del backend
 */
export async function guardarTrabajo({ titulo, url }) {
    const token = localStorage.getItem("autogrid_token");
    if (!token) throw new Error("No autenticado");
    const response = await fetch(`${API_URL}/jobs/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ titulo, url })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error al guardar oferta");
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
        throw new Error(error.detail || "Error al registrar usuario");
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
        throw new Error(error.detail || "Error al iniciar sesión");
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