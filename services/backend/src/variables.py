import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import PrivateVariable, Project, User, VariableAccess
from private_values import decrypt_value, encrypt_value, variable_cipher
from project_variables import (
    VARIABLE_NAME,
    dotenv_line,
    parse_project_data,
    project_variable_names,
)
from utils import can_edit_project, get_current_user, get_payload

router = APIRouter()
PRIVATE_HEADERS = {"Cache-Control": "no-store", "Pragma": "no-cache"}


def owned_project(db, project_uuid, user):
    project = db.query(Project).filter(Project.uuid == project_uuid).first()
    if not project or not can_edit_project(project, user):
        raise HTTPException(404, "Project not found")
    return project


def owned_variable(db, variable_id, user):
    variable = (
        db.query(PrivateVariable)
        .filter(PrivateVariable.id == variable_id, PrivateVariable.owner_id == user.id)
        .first()
    )
    if not variable:
        raise HTTPException(404, "Variable not found")
    return variable


def metadata(variable):
    return {
        "id": variable.id,
        "name": variable.name,
        "secret": variable.secret,
        "project_uuid": variable.scope_key or None,
    }


@router.get("/variables/")
def list_variables(
    response: Response,
    project_uuid: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    response.headers.update(PRIVATE_HEADERS)
    scopes = [""]
    if project_uuid:
        owned_project(db, project_uuid, user)
        scopes.append(project_uuid)
    variables = (
        db.query(PrivateVariable)
        .filter(
            PrivateVariable.owner_id == user.id, PrivateVariable.scope_key.in_(scopes)
        )
        .order_by(PrivateVariable.name)
        .all()
    )
    try:
        variable_cipher()
        available = True
    except HTTPException:
        available = False
    return {
        "storage_available": available,
        "variables": [metadata(variable) for variable in variables],
    }


@router.put("/variables/{name}/")
async def save_variable(
    name: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = await get_payload(request)
    if not VARIABLE_NAME.fullmatch(name):
        raise HTTPException(400, "Use a shell variable name, up to 128 characters")
    value = payload.get("value")
    if not isinstance(value, str) or len(value.encode()) > 65536 or "\x00" in value:
        raise HTTPException(
            400, "Value must be text, at most 64 KiB, without NUL characters"
        )
    secret = payload.get("secret", True)
    if not isinstance(secret, bool):
        raise HTTPException(400, "Secret must be a boolean")
    project_uuid = payload.get("project_uuid")
    if project_uuid is not None and (
        not isinstance(project_uuid, str) or not project_uuid
    ):
        raise HTTPException(400, "Invalid project scope")
    project = owned_project(db, project_uuid, user) if project_uuid else None
    scope = project.uuid if project else ""
    variable = (
        db.query(PrivateVariable)
        .filter_by(owner_id=user.id, scope_key=scope, name=name)
        .first()
    )
    if variable is None:
        variable = PrivateVariable(
            id=str(uuid.uuid4()),
            owner_id=user.id,
            project_id=project.id if project else None,
            scope_key=scope,
            name=name,
        )
        db.add(variable)
    variable.secret = secret
    variable.encrypted_value = encrypt_value(variable, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "This variable changed in another request; try saving again"
        ) from None
    return JSONResponse(metadata(variable), headers=PRIVATE_HEADERS)


@router.post("/variables/{variable_id}/reveal/")
def reveal_variable(
    variable_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    variable = owned_variable(db, variable_id, user)
    value = decrypt_value(variable)
    db.add(VariableAccess(owner_id=user.id, variable_id=variable.id, action="reveal"))
    db.commit()
    return JSONResponse({"value": value}, headers=PRIVATE_HEADERS)


@router.delete("/variables/{variable_id}/", status_code=204)
def delete_variable(
    variable_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(owned_variable(db, variable_id, user))
    db.commit()
    return Response(status_code=204, headers=PRIVATE_HEADERS)


@router.post("/projects/{project_uuid}/env/")
def export_env(
    project_uuid: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, project_uuid, user)
    data = parse_project_data(project.data)
    names = project_variable_names(data)
    variables = (
        db.query(PrivateVariable)
        .filter(
            PrivateVariable.owner_id == user.id,
            PrivateVariable.scope_key.in_(["", project.uuid]),
            PrivateVariable.name.in_(names),
        )
        .all()
    )
    by_name = {}
    for variable in sorted(variables, key=lambda item: bool(item.scope_key)):
        by_name[variable.name] = variable
    defaults = {
        item["name"]: item["default"]
        for item in data.get("variables", [])
        if not item["secret"] and "default" in item
    }
    missing = [name for name in names if name not in by_name and name not in defaults]
    if missing:
        raise HTTPException(
            400, "Set private values before downloading .env: " + ", ".join(missing)
        )
    lines = [
        "# Private values exported from CTK. Keep this file out of source control.\n"
    ]
    for name in names:
        variable = by_name.get(name)
        value = decrypt_value(variable) if variable else defaults[name]
        lines.append(dotenv_line(name, value))
        if variable:
            db.add(
                VariableAccess(
                    owner_id=user.id, variable_id=variable.id, action="export"
                )
            )
    db.commit()
    return Response(
        "".join(lines),
        media_type="text/plain",
        headers={
            **PRIVATE_HEADERS,
            "Content-Disposition": 'attachment; filename=".env"',
        },
    )
