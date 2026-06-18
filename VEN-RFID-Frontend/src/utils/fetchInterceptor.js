/**
 * src/utils/fetchInterceptor.js
 * ──────────────────────────────
 * Globally monkey-patches window.fetch so that:
 *
 *   • Every request whose URL contains "/api/" has its JSON body
 *     auto-encrypted  → { data: "<cipher>" }
 *
 *   • Every response from those URLs is auto-decrypted
 *     { data: "<cipher>" } → original JSON
 *
 * This makes encryption completely transparent to all existing code —
 * no changes needed in pages, components, or context files.
 *
 * Import this module ONCE at the very top of main.tsx before anything else.
 */

import { encryptPayload, decryptResponse } from './crypto.js';

const API_PATTERN = '/api/';

// Paths that should NOT be encrypted (e.g., non-JSON multipart uploads)
const SKIP_PATHS = [];

function shouldEncrypt(url) {
  if (!url) return false;
  const urlStr = typeof url === 'string' ? url : url.toString();
  return urlStr.includes(API_PATTERN) && !SKIP_PATHS.some(p => urlStr.includes(p));
}

const _originalFetch = window.fetch.bind(window);

window.fetch = async function interceptedFetch(resource, init = {}) {
  const url = typeof resource === 'string' ? resource : (resource.url || resource.toString());

  // ── Encrypt outgoing body ─────────────────────────────────────────────────
  if (shouldEncrypt(url) && init.body) {
    const contentType = (init.headers?.['Content-Type'] || init.headers?.['content-type'] || '');

    // Only encrypt JSON bodies — skip multipart/form-data (file uploads)
    if (!contentType.includes('multipart/form-data')) {
      let parsed;
      try {
        parsed = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } catch {
        parsed = init.body;
      }

      // Skip if already encrypted (has "data" key only)
      const alreadyEncrypted = parsed && typeof parsed === 'object' && 'data' in parsed && Object.keys(parsed).length === 1;

      if (!alreadyEncrypted) {
        const encryptedBody = JSON.stringify(encryptPayload(parsed));
        const existingHeaders = init.headers || {};
        init = {
          ...init,
          body: encryptedBody,
          headers: {
            ...existingHeaders,
            'Content-Type': 'application/json',
          },
        };
      }
    }
  }

  // ── Call the original fetch ───────────────────────────────────────────────
  const response = await _originalFetch(resource instanceof Request ? new Request(url, init) : url, init);

  // ── Decrypt incoming response ─────────────────────────────────────────────
  if (shouldEncrypt(url)) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Wrap the response with a decrypting .json() method
      const originalJson = response.json.bind(response);
      Object.defineProperty(response, 'json', {
        value: async () => {
          const raw = await originalJson();
          return decryptResponse(raw);
        },
        writable: true,
        configurable: true,
      });
    }
  }

  return response;
};
