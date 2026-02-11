import os
import hmac
import base64
import hashlib
import secrets

import jwt

from datetime import UTC, datetime, timedelta
from typing import Any, Optional

from jwt import PyJWTError


JWT_SECRET = os.getenv("JWT_SECRET", "ctk-local-dev-secret")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_LIFETIME = timedelta(days=15)
REFRESH_TOKEN_LIFETIME = timedelta(days=30)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def hash_password(raw_password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", raw_password.encode("utf-8"), salt.encode("utf-8"), 120000
    )
    return f"{salt}${base64.b64encode(digest).decode('utf-8')}"


def verify_password(raw_password: str, password_hash: str) -> bool:
    try:
        salt, encoded_hash = password_hash.split("$", 1)
    except ValueError:
        return False

    expected_digest = hashlib.pbkdf2_hmac(
        "sha256", raw_password.encode("utf-8"), salt.encode("utf-8"), 120000
    )
    provided_digest = base64.b64decode(encoded_hash.encode("utf-8"))
    return hmac.compare_digest(expected_digest, provided_digest)


def create_token(user_id: int, token_type: str, ttl: timedelta) -> str:
    now = _utc_now()
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: int) -> str:
    return create_token(user_id, "access", ACCESS_TOKEN_LIFETIME)


def create_refresh_token(user_id: int) -> str:
    return create_token(user_id, "refresh", REFRESH_TOKEN_LIFETIME)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except PyJWTError:
        return None
    return payload
