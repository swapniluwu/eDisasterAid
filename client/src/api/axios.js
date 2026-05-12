import axios from 'axios';
export const getPersistedAuthToken = () => localStorage.getItem('token') || null;

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
  const token = getPersistedAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Let the auth provider decide when a session is invalid.
// A generic 401 can also come from a permission check or a temporary API issue,
// and wiping storage here can make a valid saved session disappear on reload.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default API;