// Email service for support contact and password reset

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export interface SupportPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendSupportMessage(payload: SupportPayload): Promise<{ message: string }>{
  const response = await fetch(`${API_BASE_URL}/support/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to send support message');
  }
  return response.json();
}

export async function requestPasswordReset(email: string): Promise<{ message: string }>{
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to request password reset');
  }
  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }>{
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to reset password');
  }
  return response.json();
}
