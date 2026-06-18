// src/config/api.js
// Centralized API configuration

// Dynamic API configuration - works for both localhost and network IPs
// For localhost development: uses localhost:8000
// For client location: automatically uses the current host's IP
const getBaseUrl = () => {
  // If running on localhost, use localhost
  return 'http://127.0.0.1:8000/api'
  // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  //   return 'http://localhost:8000/api';
  // }
  // // Otherwise, use the same host as the frontend (for network deployment)
  // return `http://${window.location.hostname}:8000/api`;
};

const API_BASE_URL = getBaseUrl();

// Remove trailing slash if present, then add /api if not present
const normalizeBaseUrl = (url) => {
  let normalized = url.replace(/\/$/, ''); // Remove trailing slash
  if (!normalized.endsWith('/api')) {
    normalized += '/api';
  }
  return normalized;
};

export const API_CONFIG = {
  BASE_URL: API_BASE_URL, // Use directly without normalization since it's already correct
  ENDPOINTS: {
    LOGIN: '/login/',
    USERS: '/users/',
    DRIVERS: '/drivers/',
    VEHICLES: '/vehicles/',
    VEHICLE_LOGS: '/visits/',
    ENTRIES: '/entries/',
    NOTIFICATIONS: '/notifications/',
    DASHBOARD_STATS: '/dashboard-stats/',
    TOKEN_REFRESH: '/auth/refresh/',
    TOKEN: '/token/',
  }
};

// Helper function to get full URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// For backward compatibility
export const API_BASE = API_CONFIG.BASE_URL;
