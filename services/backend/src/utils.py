import json

from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import create_access_token, create_refresh_token, decode_token


DEFAULT_PROJECT = {
    "canvas": {
        "position": {"top": 0, "left": 0, "scale": 1},
        "nodes": {},
        "connections": [],
        "networks": {},
    }
}


def format_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _serialize_user(user: Any) -> dict[str, Any]:
    return {
        "pk": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
    }


def serialize_project(project: Any) -> dict[str, Any]:
    return {
        "id": project.id,
        "owner_id": project.owner_id,
        "visibility": int(project.visibility),
        "name": project.name,
        "uuid": project.uuid,
        "data": project.data,
        "created_at": format_datetime(project.created_at),
        "updated_at": format_datetime(project.updated_at),
    }


def default_project_json() -> str:
    return json.dumps(DEFAULT_PROJECT)


def normalize_project_data(raw_data: Any) -> str:
    if raw_data is None:
        return default_project_json()

    if isinstance(raw_data, str):
        try:
            parsed = json.loads(raw_data)
            while isinstance(parsed, str):
                parsed = json.loads(parsed)
            return json.dumps(parsed)
        except (json.JSONDecodeError, TypeError):
            return raw_data

    return json.dumps(raw_data)


def load_json_payload(raw_body: bytes) -> dict[str, Any]:
    if not raw_body:
        return {}

    payload: Any = json.loads(raw_body.decode("utf-8"))
    while isinstance(payload, str):
        payload = json.loads(payload)

    if not isinstance(payload, dict):
        raise ValueError("Invalid JSON payload")

    return payload


async def get_payload(request: Request) -> dict[str, Any]:
    raw_body = await request.body()
    try:
        return load_json_payload(raw_body)
    except (ValueError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=400, detail="Invalid request payload"
        ) from error


def get_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    return token


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    token = get_bearer_token(request)
    if token is None:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "user_not_found", "detail": "User not found"},
        )

    return user


def get_current_user(
    optional_user: User | None = Depends(get_optional_current_user),
) -> User:
    if optional_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return optional_user


def can_read_project(project: Any, user: Any | None) -> bool:
    if user and project.owner_id == user.id:
        return True
    if project.visibility == 1:
        return True
    if project.owner_id is None and user is None:
        return True
    return False


def can_edit_project(project: Any, user: Any | None) -> bool:
    if user and project.owner_id == user.id:
        return True
    if project.owner_id is None and user is None:
        return True
    return False


def extract_depends_on(depends_on: Any) -> list[str]:
    if isinstance(depends_on, dict):
        return list(depends_on.keys())
    if isinstance(depends_on, list):
        return [str(item) for item in depends_on]
    return []


def normalize_position(index: int) -> dict[str, int]:
    offset = 200
    step = 150
    row = index // 6
    col = index % 6
    return {"top": (row * step) + offset, "left": (col * step) + offset}


def build_service_node(
    node_name: str,
    node_uuid: str,
    service_config: dict[str, Any],
    index: int,
) -> dict[str, Any]:
    return {
        "key": node_uuid,
        "type": "SERVICE",
        "position": normalize_position(index),
        "inputs": [f"ip_{node_uuid}"],
        "outputs": [f"op_{node_uuid}"],
        "canvasConfig": {"node_name": node_name},
        "serviceConfig": service_config,
    }


def build_network_node(
    node_name: str,
    node_uuid: str,
    network_config: dict[str, Any],
    index: int,
) -> dict[str, Any]:
    return {
        "key": node_uuid,
        "type": "NETWORK",
        "position": normalize_position(index),
        "inputs": [],
        "outputs": [],
        "canvasConfig": {"node_name": node_name},
        "networkConfig": network_config,
    }


def build_pagination_urls(
    request: Request,
    limit: int,
    offset: int,
    count: int,
) -> tuple[str | None, str | None]:
    base_url = str(request.url).split("?", 1)[0]

    next_url = None
    previous_url = None

    next_offset = offset + limit
    if next_offset < count:
        next_url = f"{base_url}?limit={limit}&offset={next_offset}"

    previous_offset = offset - limit
    if previous_offset >= 0:
        previous_url = f"{base_url}?limit={limit}&offset={previous_offset}"

    return next_url, previous_url


def auth_success_payload(user: Any) -> dict[str, Any]:
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "user": _serialize_user(user),
    }
