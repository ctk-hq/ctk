import json
import uuid
import random
import string
import hashlib
import os

import requests

from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import desc, or_, func, text
from sqlalchemy.exc import IntegrityError
from email_validator import EmailNotValidError, validate_email
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from manifest_import import import_manifest
from models import Project, User
from security import create_access_token, decode_token, hash_password, verify_password
from variables import router as variables_router
from utils import (
    auth_success_payload,
    build_pagination_urls,
    can_edit_project,
    can_read_project,
    get_current_user,
    get_optional_current_user,
    get_payload,
    normalize_project_data,
    serialize_project,
    _serialize_user,
)

app = FastAPI(title="Container Toolkit API", version="1.0.0")
app.include_router(variables_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=False,
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


@app.get("/health")
def readiness(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/projects/")
def list_projects(
    request: Request,
    limit: int = 300,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    limit = max(1, min(limit, 1000))
    offset = max(0, offset)

    query = db.query(Project).filter(Project.owner_id == current_user.id)

    count = query.count()
    projects = (
        query.order_by(desc(Project.created_at)).offset(offset).limit(limit).all()
    )
    next_url, previous_url = build_pagination_urls(request, limit, offset, count)

    return {
        "count": count,
        "next": next_url,
        "previous": previous_url,
        "results": [serialize_project(project, current_user) for project in projects],
    }


@app.post("/projects/", status_code=201)
async def create_project(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    payload = await get_payload(request)

    project = Project(
        owner_id=current_user.id,
        uuid=str(uuid.uuid4()),
        name=str(payload.get("name") or "Untitled"),
        visibility=int(payload.get("visibility", 0)),
        data=normalize_project_data(payload.get("data")),
    )

    db.add(project)
    db.commit()
    db.refresh(project)
    return serialize_project(project, current_user)


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

    try:
        project_data = import_manifest(response.text)
        # Ensure the source and projection can be saved by the project API.
        json.dumps(project_data)
    except (ValueError, TypeError, RecursionError) as error:
        raise HTTPException(
            status_code=400,
            detail="Unable to import this manifest. Supply valid Compose or Kubernetes YAML with supported container structure.",
        ) from error

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
        return serialize_project(existing, current_user)

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
    return serialize_project(project, current_user)


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

    return serialize_project(project, current_user)


@app.put("/projects/{project_uuid}/")
async def update_project(
    project_uuid: str,
    request: Request,
    current_user: User = Depends(get_current_user),
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
    return serialize_project(project, current_user)


@app.delete("/projects/{project_uuid}/")
def delete_project(
    project_uuid: str,
    current_user: User = Depends(get_current_user),
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


@app.post("/generate/", status_code=410)
@app.post("/generate/docker-compose", status_code=410)
@app.post("/generate/kubernetes", status_code=410)
async def retired_manifest_generation() -> dict[str, Any]:
    return {
        "code": "",
        "error": "Server-side manifest generation has been retired. Use the browser's validated Compose/Kubernetes export.",
        "diagnostics": [
            {
                "code": "GENERATION_API_RETIRED",
                "severity": "error",
                "sourcePath": "/",
                "target": "API",
                "blocksExport": True,
                "reason": "The legacy serializer and Kompose conversion have been retired.",
                "action": "Open the project in CTK and use its validated export.",
            }
        ],
    }


@app.post("/auth/registration/", status_code=201)
async def register(request: Request, db: Session = Depends(get_db)) -> Any:
    payload = await get_payload(request)

    email = str(payload.get("email") or "").strip().lower()
    password1 = str(payload.get("password1") or "")
    password2 = str(payload.get("password2") or "")

    if not email:
        return JSONResponse(
            status_code=400, content={"email": "This field is required."}
        )
    try:
        email = validate_email(email, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        return JSONResponse(
            status_code=400, content={"email": "Enter a valid email address."}
        )
    username = str(payload.get("username") or email).strip()
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
    if len(password1) < 8:
        return JSONResponse(
            status_code=400, content={"password": "Use at least 8 characters."}
        )
    if len(email) > 200 or len(username) > 200:
        return JSONResponse(
            status_code=400, content={"email": "Email must be 200 characters or fewer."}
        )

    if db.query(User).filter(User.username == username).first():
        return JSONResponse(
            status_code=400,
            content={"username": "A user with that username already exists."},
        )

    if db.query(User).filter(func.lower(User.email) == email).first():
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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=400,
            content={"email": "An account with these details already exists."},
        )
    db.refresh(user)

    return auth_success_payload(user)


@app.post("/auth/login/")
async def login(request: Request, db: Session = Depends(get_db)) -> Any:
    payload = await get_payload(request)

    username_or_email = str(
        payload.get("email") or payload.get("username") or ""
    ).strip()
    password = str(payload.get("password") or "")

    if not username_or_email or not password:
        return JSONResponse(
            status_code=400,
            content={"detail": "Email and password are required."},
        )

    user = (
        db.query(User)
        .filter(
            or_(
                User.username == username_or_email,
                func.lower(User.email) == username_or_email.lower(),
            )
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
