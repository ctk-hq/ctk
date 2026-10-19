"""Authenticated encryption, with an independently configured key ring.

The first key encrypts new values; remaining keys allow staged key rotation.
"""

import json
import os

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from fastapi import HTTPException


def variable_cipher() -> MultiFernet:
    keys = os.getenv("CTK_VARIABLE_KEYS", "").strip()
    if not keys:
        raise HTTPException(503, "Private variable storage is not configured")
    try:
        return MultiFernet([Fernet(key.strip().encode()) for key in keys.split(",")])
    except (ValueError, TypeError):
        raise HTTPException(
            503, "Private variable encryption keys are invalid"
        ) from None


def encrypt_value(variable, value: str) -> str:
    # Bind ciphertext to its row and owner so swapping encrypted rows fails closed.
    document = json.dumps(
        [variable.id, variable.owner_id, variable.scope_key, variable.name, value]
    )
    return variable_cipher().encrypt(document.encode()).decode()


def decrypt_value(variable) -> str:
    try:
        document = json.loads(
            variable_cipher().decrypt(variable.encrypted_value.encode())
        )
        if document[:4] != [
            variable.id,
            variable.owner_id,
            variable.scope_key,
            variable.name,
        ]:
            raise ValueError("Invalid binding")
        return document[4]
    except (InvalidToken, ValueError, IndexError, TypeError):
        raise HTTPException(
            503, "Unable to decrypt the saved value; check the configured key ring"
        ) from None
