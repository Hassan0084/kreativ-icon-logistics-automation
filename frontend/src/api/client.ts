import axios from 'axios';

/**
 * Base URL for the API.
 *
 * In local development the Vite dev server proxies `/api` to the backend on
 * port 5000, so the relative default works. Once the frontend is deployed
 * separately (e.g. Netlify) there is no local backend to proxy to, so
 * `VITE_API_URL` must point at the deployed API origin.
 */
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kic_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if 401 Unauthorized
      localStorage.removeItem('kic_token');
      localStorage.removeItem('kic_user');
      if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/track')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
