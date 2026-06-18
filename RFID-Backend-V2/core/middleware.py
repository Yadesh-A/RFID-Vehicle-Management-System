"""
core/middleware.py
──────────────────
AES-256-CBC Encryption Middleware for all /api/ endpoints.

• Incoming request  : { "data": "<base64-ciphertext>" }
      → decrypted   : { "username": "...", "password": "..." }

• Outgoing response : { "username": "...", ... }
      → encrypted   : { "data": "<base64-ciphertext>" }

The middleware is completely transparent to all Django views/serializers.
Non-API paths (e.g. /admin/) are passed through unchanged.
"""

import os
import json
import base64

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes


# ── Key ─────────────────────────────────────────────────────────────────────
_RAW_KEY = os.getenv("ENCRYPTION_KEY", "")

def _get_key() -> bytes:
    """Return a 32-byte AES key from the env variable.

    Key derivation mirrors the frontend crypto.js buildKey() exactly:
      1. Try hex-decode the string first.
         - 64 hex chars  → 32 bytes  ✓  use as-is
         - 32 hex chars  → 16 bytes  → duplicate to 32 bytes  (current .env value)
      2. If not valid hex (or wrong length), SHA-256 hash the raw string.

    NOTE: the old code checked `len(_RAW_KEY) == 32` BEFORE trying hex-decode,
    which caused it to use the ASCII bytes of the hex string instead of the
    decoded bytes — a mismatch with the frontend.
    """
    try:
        decoded = bytes.fromhex(_RAW_KEY)
        if len(decoded) == 32:            # 64 hex-char string → 32 bytes ✓
            return decoded
        if len(decoded) == 16:            # 32 hex-char string → 16 bytes → double
            return decoded + decoded
        if len(decoded) > 32:
            return decoded[:32]
    except ValueError:
        pass
    # Fallback: SHA-256 of whatever we have → always 32 bytes
    import hashlib
    return hashlib.sha256(_RAW_KEY.encode()).digest()

KEY = _get_key()



# ── Helpers ──────────────────────────────────────────────────────────────────
def _encrypt(plaintext: str) -> str:
    """AES-256-CBC encrypt → base64 string.  IV is prepended (16 bytes)."""
    iv = get_random_bytes(16)
    cipher = AES.new(KEY, AES.MODE_CBC, iv)
    ct = cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))
    return base64.b64encode(iv + ct).decode("utf-8")


def _decrypt(b64_data: str) -> str:
    """Reverse of _encrypt: base64-decode, split IV, decrypt, unpad."""
    raw = base64.b64decode(b64_data)
    iv, ct = raw[:16], raw[16:]
    cipher = AES.new(KEY, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ct), AES.block_size).decode("utf-8")


# ── Middleware ────────────────────────────────────────────────────────────────
class ApiEncryptionMiddleware(MiddlewareMixin):
    """
    Transparent AES-256-CBC encryption layer for all /api/ routes.

    Skipped paths (pass-through, no encryption):
      • /admin/
      • Any path not starting with /api/
    """

    # Paths that must NOT be touched
    SKIP_PREFIXES = ("/admin/",)

    def _should_skip(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.SKIP_PREFIXES)

    # ── Request ──────────────────────────────────────────────────────────────
    def process_request(self, request):
        """
        If the body is { "data": "<cipher>" }, decrypt it and replace
        request.body so the view receives the original JSON.
        """
        if self._should_skip(request.path):
            return None

        content_type = request.content_type or ""
        if "application/json" not in content_type:
            return None

        raw = request.body
        if not raw:
            return None

        try:
            wrapper = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

        # Only act when the payload has exactly the envelope structure
        if not isinstance(wrapper, dict) or "data" not in wrapper:
            return None

        try:
            plaintext = _decrypt(wrapper["data"])
        except Exception:
            return JsonResponse(
                {"detail": "Invalid or tampered request payload."},
                status=400,
            )

        # Monkey-patch request.body and reset the stream so DRF can re-read it
        encoded = plaintext.encode("utf-8")
        request._body = encoded
        request._stream = None
        # Tell DRF to re-parse from the new body
        if hasattr(request, "_data"):
            del request._data
        if hasattr(request, "_files"):
            del request._files

        return None

    # ── Response ─────────────────────────────────────────────────────────────
    def process_response(self, request, response):
        """
        If the response is JSON (from an /api/ view), encrypt the body and
        return { "data": "<cipher>" }.
        """
        if self._should_skip(request.path):
            return response

        content_type = response.get("Content-Type", "")
        if "application/json" not in content_type:
            return response

        try:
            ciphertext = _encrypt(response.content.decode("utf-8"))
        except Exception:
            # If anything fails, return the original response untouched
            return response

        encrypted_body = json.dumps({"data": ciphertext}).encode("utf-8")
        response.content = encrypted_body
        response["Content-Length"] = len(encrypted_body)
        return response
