import { setCookie, getCookie } from './cookie';

let tokenRefreshTimer = null;

// Decode JWT to get expiration time
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

// Store tokens in cookies and schedule refresh
export function storeAuthTokens({ access, refresh }) {
  setCookie('access', access);
  setCookie('refresh', refresh);
  scheduleTokenRefresh(access);
}

// Schedule automatic token refresh
export function scheduleTokenRefresh(accessToken) {
  // Clear existing timer
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
  }

  if (!accessToken) return;

  const payload = decodeToken(accessToken);
  if (!payload || !payload.exp) return;

  // Calculate time until expiry (in milliseconds)
  const expiryTime = payload.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiry = expiryTime - currentTime;

  // Refresh token 5 minutes before expiry (adjust as needed)
  const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000);

  console.log(`Token will refresh in ${(refreshTime / 1000 / 60).toFixed(2)} minutes`);

  tokenRefreshTimer = setTimeout(async () => {
    console.log('Auto-refreshing token...');
    try {
      const { refreshAccess } = await import('./api');
      await refreshAccess();
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }
  }, refreshTime);
}

// Get access token from cookies
export function getAccessToken() {
  return getCookie('access');
}

// Get refresh token from cookies
export function getRefreshToken() {
  return getCookie('refresh');
}

// Remove tokens from cookies
export function clearAuthTokens() {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
  setCookie('access', '', -1);
  setCookie('refresh', '', -1);
}
