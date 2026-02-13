import copy
import json
import uuid
import yaml
import random
import string
import hashlib

import requests

from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from manifest_generation import (
    generate_docker_compose_yaml,
    generate_kubernetes_manifest,
)
from models import Project, User
from security import create_access_token, decode_token, hash_password, verify_password
from utils import (
    DEFAULT_PROJECT,
    auth_success_payload,
    build_network_node,
    build_pagination_urls,
    build_service_node,
    build_volume_node,
    can_edit_project,
    can_read_project,
    extract_depends_on,
    extract_service_volume_mounts,
    get_current_user,
    get_optional_current_user,
    get_payload,
    normalize_project_data,
    serialize_project,
    _serialize_user,
)


app = FastAPI(title="Container Toolkit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_database() -> None:
    Base.metadata.create_all(bind=engine)


@app.on_event("startup")
def _startup() -> None:
    init_database()


@app.get("/")
def health() -> dict[str, Any]:
    return {}


@app.get("/projects/")
def list_projects(
    request: Request,
    limit: int = 300,
    offset: int = 0,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    limit = max(1, min(limit, 1000))
    offset = max(0, offset)

    query = db.query(Project)
    if current_user:
        query = query.filter(Project.owner_id == current_user.id)
    else:
        query = query.filter(Project.owner_id.is_(None))

    count = query.count()
    projects = (
        query.order_by(desc(Project.created_at)).offset(offset).limit(limit).all()
    )
    next_url, previous_url = build_pagination_urls(request, limit, offset, count)

    return {
        "count": count,
        "next": next_url,
        "previous": previous_url,
        "results": [serialize_project(project) for project in projects],
    }


@app.post("/projects/", status_code=201)
async def create_project(
    request: Request,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    payload = await get_payload(request)

    project = Project(
        owner_id=current_user.id if current_user else None,
        uuid=str(uuid.uuid4())[:10],
        name=str(payload.get("name") or "Untitled"),
        visibility=int(payload.get("visibility", 0)),
        data=normalize_project_data(payload.get("data")),
    )

    db.add(project)
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@app.post("/projects/import/", status_code=201)
async def import_project(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    payload = await get_payload(request)
    import_url = payload.get("url")

    if not import_url:
        raise HTTPException(status_code=400, detail="Missing 'url' in request payload")

    try:
        response = requests.get(import_url, allow_redirects=True, timeout=20)
        response.raise_for_status()
    except requests.RequestException as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    imported = yaml.safe_load(response.content) or {}

    if not isinstance(imported, dict):
        raise HTTPException(status_code=400, detail="Imported YAML must be an object")

    project_data = copy.deepcopy(DEFAULT_PROJECT)
    node_order: dict[str, int] = {}
    services = (
        imported.get("services", {})
        if isinstance(imported.get("services"), dict)
        else {}
    )
    volumes = (
        imported.get("volumes", {}) if isinstance(imported.get("volumes"), dict) else {}
    )
    networks = (
        imported.get("networks", {})
        if isinstance(imported.get("networks"), dict)
        else {}
    )
    service_name_uuid: dict[str, str] = {}
    volume_name_uuid: dict[str, str] = {}
    network_name_uuid: dict[str, str] = {}
    counter = 0

    for service_name in services:
        generated_uuid = f"service-{uuid.uuid4()}"
        service_name_uuid[service_name] = generated_uuid
        node_order[generated_uuid] = counter
        counter += 1

    for volume_name in volumes:
        generated_uuid = f"volume-{uuid.uuid4()}"
        volume_name_uuid[volume_name] = generated_uuid
        node_order[generated_uuid] = counter
        counter += 1

    for network_name in networks:
        generated_uuid = f"network-{uuid.uuid4()}"
        network_name_uuid[network_name] = generated_uuid
        node_order[generated_uuid] = counter
        counter += 1

    for service_name, service_config in services.items():
        service_uuid = service_name_uuid[service_name]
        project_data["canvas"]["nodes"][service_uuid] = build_service_node(
            service_name,
            service_uuid,
            service_config,
            node_order[service_uuid],
        )

        for dependency in extract_depends_on(service_config.get("depends_on")):
            dependency_uuid = service_name_uuid.get(dependency)

            if dependency_uuid:
                project_data["canvas"]["connections"].append(
                    [service_uuid, dependency_uuid]
                )

        for volume_mount in extract_service_volume_mounts(
            service_config.get("volumes")
        ):
            volume_uuid = volume_name_uuid.get(volume_mount)

            if volume_uuid:
                project_data["canvas"]["connections"].append(
                    [volume_uuid, service_uuid]
                )

    for volume_name, volume_config in volumes.items():
        volume_uuid = volume_name_uuid[volume_name]
        project_data["canvas"]["nodes"][volume_uuid] = build_volume_node(
            volume_name,
            volume_uuid,
            volume_config if isinstance(volume_config, dict) else {},
            node_order[volume_uuid],
        )

    for network_name, network_config in networks.items():
        network_uuid = network_name_uuid[network_name]
        project_data["canvas"]["nodes"][network_uuid] = build_network_node(
            network_name,
            network_uuid,
            network_config,
            node_order[network_uuid],
        )

    project_hash = str(
        int(hashlib.sha1(import_url.encode("utf-8")).hexdigest(), 16) % (10**8)
    )
    hash_prefix = "".join(chr(ord("a") + int(digit)) for digit in project_hash)
    random_suffix = "".join(random.choices(string.ascii_lowercase, k=5))
    project_uuid = f"{hash_prefix}_{random_suffix}"

    existing = (
        db.query(Project)
        .filter(Project.uuid == project_uuid, Project.owner_id == current_user.id)
        .first()
    )

    if existing:
        existing.data = json.dumps(project_data)
        existing.visibility = int(payload.get("visibility", 0))
        existing.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(existing)
        return serialize_project(existing)

    project = Project(
        owner_id=current_user.id,
        name=project_uuid,
        uuid=project_uuid,
        visibility=int(payload.get("visibility", 0)),
        data=json.dumps(project_data),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@app.get("/projects/{project_uuid}/")
def get_project(
    project_uuid: str,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> Any:
    project = db.query(Project).filter(Project.uuid == project_uuid).first()
    if not project:
        return JSONResponse(content={}, status_code=404)

    if not can_read_project(project, current_user):
        return JSONResponse(content={}, status_code=404)

    return serialize_project(project)


@app.put("/projects/{project_uuid}/")
async def update_project(
    project_uuid: str,
    request: Request,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> Any:
    project = db.query(Project).filter(Project.uuid == project_uuid).first()
    if not project:
        return JSONResponse(content={}, status_code=404)

    if not can_edit_project(project, current_user):
        return JSONResponse(content={}, status_code=404)

    payload = await get_payload(request)

    if "name" in payload:
        project.name = str(payload["name"])

    if "visibility" in payload:
        project.visibility = int(payload["visibility"])

    if "data" in payload:
        project.data = normalize_project_data(payload["data"])

    project.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(project)
    return serialize_project(project)


@app.delete("/projects/{project_uuid}/")
def delete_project(
    project_uuid: str,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> Any:
    project = db.query(Project).filter(Project.uuid == project_uuid).first()
    if not project:
        return JSONResponse(content={}, status_code=404)

    if not can_edit_project(project, current_user):
        return JSONResponse(content={}, status_code=404)

    db.delete(project)
    db.commit()
    return Response(status_code=204)


@app.post("/generate/")
async def generate_docker_compose(request: Request) -> dict[str, str]:
    payload = await get_payload(request)
    data = payload.get("data", {})
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=400, detail="Expected payload.data to be an object"
        )

    return {"code": generate_docker_compose_yaml(data)}


@app.post("/generate/docker-compose")
async def generate_docker_compose_alias(request: Request) -> dict[str, str]:
    return await generate_docker_compose(request)


@app.post("/generate/kubernetes")
async def generate_kubernetes(request: Request) -> dict[str, str]:
    payload = await get_payload(request)
    data = payload.get("data", {})
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=400, detail="Expected payload.data to be an object"
        )

    return generate_kubernetes_manifest(data)


@app.post("/auth/registration/", status_code=201)
async def register(request: Request, db: Session = Depends(get_db)) -> Any:
    payload = await get_payload(request)

    username = str(payload.get("username") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    password1 = str(payload.get("password1") or "")
    password2 = str(payload.get("password2") or "")

    if not username:
        return JSONResponse(
            status_code=400, content={"username": "This field is required."}
        )
    if not email:
        return JSONResponse(
            status_code=400, content={"email": "This field is required."}
        )
    if not password1 or not password2:
        return JSONResponse(
            status_code=400,
            content={"password": "Both password fields are required."},
        )
    if password1 != password2:
        return JSONResponse(
            status_code=400,
            content={"password2": "The two password fields didn't match."},
        )

    if db.query(User).filter(User.username == username).first():
        return JSONResponse(
            status_code=400,
            content={"username": "A user with that username already exists."},
        )

    if db.query(User).filter(User.email == email).first():
        return JSONResponse(
            status_code=400,
            content={"email": "A user with that email already exists."},
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password1),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return auth_success_payload(user)


@app.post("/auth/login/")
async def login(request: Request, db: Session = Depends(get_db)) -> Any:
    payload = await get_payload(request)

    username_or_email = str(payload.get("username") or "").strip()
    password = str(payload.get("password") or "")

    if not username_or_email or not password:
        return JSONResponse(
            status_code=400,
            content={"detail": "Username and password are required."},
        )

    user = (
        db.query(User)
        .filter(
            or_(User.username == username_or_email, User.email == username_or_email)
        )
        .first()
    )

    if not user or not verify_password(password, user.password_hash):
        return JSONResponse(
            status_code=400,
            content={"detail": "Unable to log in with provided credentials."},
        )

    return auth_success_payload(user)


@app.get("/auth/self/")
def self(current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    return _serialize_user(current_user)


@app.post("/auth/token/refresh/")
async def refresh_token(
    request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    payload = await get_payload(request)
    refresh = payload.get("refresh")

    if not refresh or not isinstance(refresh, str):
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    token_payload = decode_token(refresh)
    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    user_id = token_payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"code": "user_not_found", "detail": "User not found"},
        )

    return {"access": create_access_token(user.id)}


@app.post("/auth/github/")
def github_auth() -> JSONResponse:
    return JSONResponse(
        status_code=501,
        content={"detail": "GitHub social login is not configured for this backend."},
    )
