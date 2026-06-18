// src/config/api.production.js
// Production API configuration for client location

// For client location deployment, update this IP address to match the server's IP
const API_BASE_URL = 'http://192.168.1.10:8000/api';

// Remove trailing slash if present, then add /api if not present
const normalizeBaseUrl = (url) => {
  let normalized = url.replace(/\/$/, ''); // Remove trailing slash
  if (!normalized.endsWith('/api')) {
    normalized += '/api';
  }
  return normalized;
};

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
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
