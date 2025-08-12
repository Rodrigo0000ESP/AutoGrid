import axios from 'axios';

// Global axios configuration for CORS and credentials
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Only try to access localStorage in the browser environment
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('token');
        console.log('JWT Token from localStorage:', token ? 'Token found' : 'No token found');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Request config with auth header:', {
            url: config.url,
            method: config.method,
            headers: {
              ...config.headers,
              // Don't log the full token for security
              Authorization: config.headers.Authorization ? 'Bearer [TOKEN]' : undefined,
            },
            data: config.data,
          });
        } else {
          console.warn('No JWT token found in localStorage. User may not be logged in.');
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: {
            ...error.config?.headers,
            Authorization: error.config?.headers?.Authorization ? 'Bearer [TOKEN]' : undefined,
          },
        },
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Get available subscription plans
 * @returns {Promise<Array>} List of plans with pricing and feature details
 */
export const getPlans = async () => {
  try {
    const response = await api.get('/subscription/plans');
    return response.data?.data || [];
  } catch (error) {
    console.error('Error getting plans:', error);
    return [];
  }
};

/**
 * Create a checkout session for a plan
 * @param {string} priceId - Stripe price ID
 * @returns {Promise<{sessionId: string}>} Checkout session details
 */
export const createCheckoutSession = async (priceId: string) => {
  console.log('Creating checkout session for price ID:', priceId);
  try {
    const response = await api.post('/subscription/create-checkout-session', {
      price_id: priceId
    });
    console.log('Checkout session created successfully:', response.data);
    return response.data.data;
  } catch (error: any) {
    console.error('Error creating checkout session:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response data',
      request: error.request ? 'Request was made but no response received' : 'No request was made'
    });
    
    // Provide a more user-friendly error message
    if (error.response) {
      // Handle 401 Unauthorized specifically
      if (error.response.status === 401) {
        throw new Error('You need to be logged in to subscribe. Please log in and try again.');
      }
      // Handle other status codes
      throw new Error(error.response.data.detail || 'Failed to create checkout session. Please try again.');
    } else if (error.request) {
      throw new Error('No response from server. Please check your internet connection and try again.');
    } else {
      throw new Error('An error occurred while setting up the checkout. Please try again.');
    }
  }
};

/**
 * Get current user's subscription status
 * @returns {Promise<Object>} Subscription status and details
 */
export const getSubscriptionStatus = async () => {
  try {
    const response = await api.get('/subscription/status');
    return response.data.data;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
};
