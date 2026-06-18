/**
 * src/utils/api.js
 * ─────────────────
 * Thin fetch wrapper that:
 *   1. Attaches the Bearer token from cookies
 *   2. Encrypts the request body (if any) using AES-256-CBC  → { data: "<cipher>" }
 *   3. Decrypts the response body                            ← { data: "<cipher>" }
 *   4. Auto-refreshes the token on 401 and retries once
 */

import { getAccessToken, getRefreshToken, storeAuthTokens, scheduleTokenRefresh } from './auth';
import { getApiUrl, API_CONFIG } from '../config/api.js';
import { encryptPayload, decryptResponse } from './crypto.js';

// ── apiFetch ─────────────────────────────────────────────────────────────────
export async function apiFetch(url, options = {}) {
  const token = getAccessToken();

  // ① Encrypt the body (if it exists and is already a JSON string or object)
  let body = options.body;
  if (body !== undefined && body !== null) {
    // body can arrive as a JSON string (most callers do JSON.stringify())
    let parsed;
    if (typeof body === 'string') {
      try { parsed = JSON.parse(body); } catch { parsed = body; }
    } else {
      parsed = body;
    }
    body = JSON.stringify(encryptPayload(parsed));
  }

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, { ...options, body, headers });

  // ② Auto-refresh on 401
  if (res.status === 401) {
    const ok = await refreshAccess();
    if (!ok) throw new Error('Session expired. Please log in again.');

    const newToken = getAccessToken();
    const retryHeaders = {
      ...(options.headers || {}),
      Authorization: `Bearer ${newToken}`,
      'Content-Type': 'application/json',
    };
    return fetch(url, { ...options, body, headers: retryHeaders });
  }

  // ③ Return a patched Response whose .json() auto-decrypts
  return _wrapResponse(res);
}

// ── Response wrapper ──────────────────────────────────────────────────────────
/**
 * Wraps a native Response so that calling .json() on it transparently
 * decrypts the { data: "<cipher>" } envelope and returns the plain object.
 */
function _wrapResponse(res) {
  const originalJson = res.json.bind(res);
  res.json = async () => {
    const raw = await originalJson();
    return decryptResponse(raw);
  };
  return res;
}

// ── refreshAccess ─────────────────────────────────────────────────────────────
export async function refreshAccess() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    // Encrypt the refresh token payload before sending
    const encryptedBody = JSON.stringify(encryptPayload({ refresh }));

    const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TOKEN_REFRESH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: encryptedBody,
    });

    if (!res.ok) return false;

    const raw = await res.json();
    const data = decryptResponse(raw);
    storeAuthTokens({ access: data.access, refresh: data.refresh || refresh });
    scheduleTokenRefresh(data.access);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}
