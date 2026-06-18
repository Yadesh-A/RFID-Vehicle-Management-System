/**
 * src/utils/crypto.js
 * ────────────────────
 * AES-256-CBC helpers that mirror the Django middleware.
 *
 * Every outgoing API body is wrapped:   { data: "<base64-ciphertext>" }
 * Every incoming API body is unwrapped: { data: "<base64-ciphertext>" } → plain object
 *
 * The shared key comes from VITE_ENCRYPTION_KEY (must match backend ENCRYPTION_KEY).
 */

import CryptoJS from 'crypto-js';

// ── Key ───────────────────────────────────────────────────────────────────────
const RAW_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '5f3b8d2a1e4c9f7a6b0d3e8c2f5a4b7d';

/**
 * Build a CryptoJS WordArray key.
 * We accept a 32-hex-char string → parse as 16-byte hex → pad to 32 bytes.
 */
function buildKey() {
  // Try hex parse first
  const parsed = CryptoJS.enc.Hex.parse(RAW_KEY);
  const byteLen = parsed.sigBytes;

  if (byteLen === 32) return parsed;           // 64 hex chars → 32 bytes ✓
  if (byteLen === 16) {
    // 32 hex chars → 16 bytes → duplicate to 32 bytes
    const hex32 = RAW_KEY + RAW_KEY;
    return CryptoJS.enc.Hex.parse(hex32);
  }
  // Fallback: SHA-256 of whatever string we have → always 32 bytes
  return CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(RAW_KEY));
}

const KEY = buildKey();

// ── Encrypt ───────────────────────────────────────────────────────────────────
/**
 * encryptPayload(obj)
 *   Takes a plain JS object, JSON-serialises it, AES-256-CBC encrypts it,
 *   and returns the envelope:  { data: "<base64(iv + ciphertext)>" }
 */
export function encryptPayload(obj) {
  const plaintext = typeof obj === 'string' ? obj : JSON.stringify(obj);

  // Random 16-byte IV
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plaintext),
    KEY,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  // Prepend IV to ciphertext, then base64-encode the whole thing
  const combined = iv.concat(encrypted.ciphertext);
  const b64 = CryptoJS.enc.Base64.stringify(combined);

  return { data: b64 };
}

// ── Decrypt ───────────────────────────────────────────────────────────────────
/**
 * decryptResponse(obj)
 *   Takes the envelope { data: "<base64>" } returned by the backend,
 *   decrypts it, and returns the parsed JS object.
 *
 *   If the object does NOT have a "data" field it is returned as-is
 *   (safety net so the app doesn't break if encryption is disabled temporarily).
 */
export function decryptResponse(obj) {
  if (!obj || typeof obj !== 'object' || !('data' in obj)) {
    return obj; // Not an encrypted envelope — pass through
  }

  const combined = CryptoJS.enc.Base64.parse(obj.data);

  // First 16 bytes = IV, rest = ciphertext
  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const ciphertextWords = combined.words.slice(4);
  const ciphertextLen = combined.sigBytes - 16;
  const ciphertext = CryptoJS.lib.WordArray.create(ciphertextWords, ciphertextLen);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext },
    KEY,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  return JSON.parse(plaintext);
}
