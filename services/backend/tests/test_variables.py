import json
import os
import shutil
import subprocess

import pytest
from cryptography.fernet import Fernet

from database import SessionLocal
from models import PrivateVariable, Project, VariableAccess
from test_accounts_and_projects import client, headers, register  # noqa: F401


@pytest.fixture(autouse=True)
def encryption_key(monkeypatch):
    monkeypatch.setenv("CTK_VARIABLE_KEYS", Fernet.generate_key().decode())


def make_project(client, owner, *, public=True):
    response = client.post(
        "/projects/",
        headers=headers(owner),
        json={
            "name": "Postgres template",
            "visibility": int(public),
            "data": {
                "variables": [
                    {"name": "DB_PASSWORD", "secret": True},
                    {"name": "TZ", "secret": False, "default": "UTC"},
                ],
                "canvas": {
                    "nodes": {
                        "db": {
                            "type": "SERVICE",
                            "serviceConfig": {
                                "image": "postgres",
                                "environment": {"POSTGRES_PASSWORD": "${DB_PASSWORD}"},
                            },
                        }
                    }
                },
            },
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def save_value(
    client, owner, name="DB_PASSWORD", value="private-test-password", **scope
):
    response = client.put(
        f"/variables/{name}/",
        headers=headers(owner),
        json={"value": value, "secret": True, **scope},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_public_project_never_contains_private_values_or_bindings(client):
    owner = register(client)
    project = make_project(client, owner)
    variable = save_value(client, owner)
    assert set(variable) == {"id", "name", "secret", "project_uuid"}
    for path, request_headers in [
        (f"/projects/{project['uuid']}/", {}),
        (f"/projects/{project['uuid']}/", headers(owner)),
        ("/projects/", headers(owner)),
        ("/variables/", headers(owner)),
    ]:
        response = client.get(path, headers=request_headers)
        assert response.status_code == 200
        assert "private-test-password" not in response.text
        assert "encrypted_value" not in response.text
    public = client.get(f"/projects/{project['uuid']}/").json()
    assert public["can_edit"] is False
    assert "${DB_PASSWORD}" in public["data"]
    assert variable["id"] not in public["data"]
    with SessionLocal() as db:
        row = db.query(PrivateVariable).one()
        assert (
            row.encrypted_value and "private-test-password" not in row.encrypted_value
        )
        assert "private-test-password" not in db.query(Project).one().data


def test_reveal_and_export_require_ownership_even_for_public_projects(client):
    owner = register(client)
    other = register(client, "bob@example.com")
    project = make_project(client, owner)
    variable = save_value(client, owner)
    path = f"/variables/{variable['id']}/"
    for request_headers, expected in [({}, 401), (headers(other), 404)]:
        assert (
            client.post(path + "reveal/", headers=request_headers).status_code
            == expected
        )
        assert client.delete(path, headers=request_headers).status_code == expected
        assert (
            client.post(
                f"/projects/{project['uuid']}/env/", headers=request_headers
            ).status_code
            == expected
        )
    assert client.get("/variables/", headers=headers(other)).json()["variables"] == []
    assert (
        client.get(
            f"/variables/?project_uuid={project['uuid']}", headers=headers(other)
        ).status_code
        == 404
    )
    assert (
        client.put(
            "/variables/DB_PASSWORD/",
            headers=headers(other),
            json={"value": "hijacked", "project_uuid": project["uuid"]},
        ).status_code
        == 404
    )
    revealed = client.post(path + "reveal/", headers=headers(owner))
    assert revealed.json() == {"value": "private-test-password"}
    assert revealed.headers["cache-control"] == "no-store"
    assert (
        client.get("/variables/", headers=headers(owner)).headers["cache-control"]
        == "no-store"
    )
    with SessionLocal() as db:
        audit = db.query(VariableAccess).one()
        assert audit.owner_id == owner["user"]["pk"]
        assert audit.variable_id == variable["id"]
        assert audit.action == "reveal"


def test_project_override_and_reuse_without_copying_values(client):
    owner = register(client)
    first, second = make_project(client, owner), make_project(client, owner)
    account = save_value(client, owner, value="account-password")
    override = save_value(
        client, owner, value="project-password", project_uuid=first["uuid"]
    )
    first_env = client.post(f"/projects/{first['uuid']}/env/", headers=headers(owner))
    second_env = client.post(f"/projects/{second['uuid']}/env/", headers=headers(owner))
    assert 'DB_PASSWORD="project-password"' in first_env.text
    assert 'DB_PASSWORD="account-password"' in second_env.text
    assert 'TZ="UTC"' in first_env.text
    assert first_env.headers["cache-control"] == "no-store"
    assert first_env.headers["content-disposition"] == 'attachment; filename=".env"'
    assert {
        item["id"]
        for item in client.get(
            f"/variables/?project_uuid={first['uuid']}", headers=headers(owner)
        ).json()["variables"]
    } == {account["id"], override["id"]}
    client.delete(f"/projects/{first['uuid']}/", headers=headers(owner))
    with SessionLocal() as db:
        assert [row.id for row in db.query(PrivateVariable).all()] == [account["id"]]
        assert db.query(VariableAccess).filter_by(action="export").count() == 2


def test_copied_public_project_uses_the_new_owners_values(client):
    alice = register(client)
    bob = register(client, "bob@example.com")
    original = make_project(client, alice)
    save_value(client, alice, value="alice-password")
    public = client.get(f"/projects/{original['uuid']}/").json()
    copy = client.post(
        "/projects/", headers=headers(bob), json={"data": json.loads(public["data"])}
    ).json()
    missing = client.post(f"/projects/{copy['uuid']}/env/", headers=headers(bob))
    assert missing.status_code == 400
    assert "DB_PASSWORD" in missing.text and "alice-password" not in missing.text
    save_value(client, bob, value="bob-password")
    exported = client.post(f"/projects/{copy['uuid']}/env/", headers=headers(bob))
    assert 'DB_PASSWORD="bob-password"' in exported.text
    assert "alice-password" not in exported.text


def test_project_save_rejects_secret_defaults_and_private_bindings(client):
    owner = register(client)
    for definition in [
        {"name": "PASS", "secret": True, "default": "oops"},
        {"name": "PASS", "secret": True, "value": "oops"},
        {"name": "PASS", "secret": True, "secret_id": "private-binding"},
        {"name": "BAD-NAME", "secret": True},
    ]:
        assert (
            client.post(
                "/projects/",
                headers=headers(owner),
                json={"data": {"variables": [definition]}},
            ).status_code
            == 400
        )
    project = make_project(client, owner)
    assert (
        client.put(
            f"/projects/{project['uuid']}/",
            headers=headers(owner),
            json={
                "data": json.dumps(
                    {"variables": [{"name": "PASS", "secret": True, "value": "oops"}]}
                )
            },
        ).status_code
        == 400
    )


def test_missing_or_wrong_keys_fail_closed_and_rotation_reads_old_values(
    client, monkeypatch
):
    owner = register(client)
    variable = save_value(client, owner)
    path = f"/variables/{variable['id']}/reveal/"
    old_key = os.environ["CTK_VARIABLE_KEYS"]
    new_key = Fernet.generate_key().decode()
    monkeypatch.setenv("CTK_VARIABLE_KEYS", f"{new_key},{old_key}")
    assert (
        client.post(path, headers=headers(owner)).json()["value"]
        == "private-test-password"
    )
    monkeypatch.setenv("CTK_VARIABLE_KEYS", new_key)
    assert client.post(path, headers=headers(owner)).status_code == 503
    monkeypatch.delenv("CTK_VARIABLE_KEYS")
    assert (
        client.get("/variables/", headers=headers(owner)).json()["storage_available"]
        is False
    )
    assert (
        client.get("/variables/", headers=headers(owner)).json()["storage_error"]
        == "Private variable storage is not configured"
    )
    assert (
        client.put(
            "/variables/NEW/", headers=headers(owner), json={"value": "not-saved"}
        ).status_code
        == 503
    )
    with SessionLocal() as db:
        assert db.query(PrivateVariable).count() == 1


def test_ciphertext_is_bound_to_its_owner_scope_and_name(client):
    owner = register(client)
    first = save_value(client, owner, name="FIRST")
    save_value(client, owner, name="SECOND")
    with SessionLocal() as db:
        rows = db.query(PrivateVariable).order_by(PrivateVariable.name).all()
        rows[0].encrypted_value = rows[1].encrypted_value
        db.commit()
    assert (
        client.post(
            f"/variables/{first['id']}/reveal/", headers=headers(owner)
        ).status_code
        == 503
    )


def test_private_updates_and_deletion_do_not_change_project_data(client):
    owner = register(client)
    project = make_project(client, owner)
    variable = save_value(client, owner)
    updated = save_value(client, owner, value="replacement")
    assert updated["id"] == variable["id"]
    assert client.post(
        f"/variables/{variable['id']}/reveal/", headers=headers(owner)
    ).json() == {"value": "replacement"}
    assert (
        client.delete(
            f"/variables/{variable['id']}/", headers=headers(owner)
        ).status_code
        == 204
    )
    assert (
        client.post(
            f"/variables/{variable['id']}/reveal/", headers=headers(owner)
        ).status_code
        == 404
    )
    assert client.get(f"/projects/{project['uuid']}/").json()["data"] == project["data"]


def test_scope_edits_move_the_same_value_and_rebind_ciphertext(client):
    owner = register(client)
    project = make_project(client, owner)
    variable = save_value(client, owner)
    path = f"/variables/{variable['id']}/"
    with SessionLocal() as db:
        original = db.query(PrivateVariable).one().encrypted_value
    moved = client.patch(
        path, headers=headers(owner), json={"project_uuid": project["uuid"]}
    )
    assert moved.status_code == 200
    assert moved.json() == {**variable, "project_uuid": project["uuid"]}
    assert moved.headers["cache-control"] == "no-store"
    assert "private-test-password" not in moved.text
    assert client.get("/variables/", headers=headers(owner)).json()["variables"] == []
    with SessionLocal() as db:
        row = db.query(PrivateVariable).one()
        assert row.id == variable["id"]
        assert row.project_id == project["id"]
        assert row.scope_key == project["uuid"]
        assert row.encrypted_value != original
    assert client.post(path + "reveal/", headers=headers(owner)).json() == {
        "value": "private-test-password"
    }
    assert (
        'DB_PASSWORD="private-test-password"'
        in client.post(f"/projects/{project['uuid']}/env/", headers=headers(owner)).text
    )
    moved_back = client.patch(
        path, headers=headers(owner), json={"project_uuid": None, "secret": False}
    )
    assert moved_back.status_code == 200
    assert moved_back.json() == {**variable, "secret": False}
    assert client.post(path + "reveal/", headers=headers(owner)).json() == {
        "value": "private-test-password"
    }
    assert client.get(f"/projects/{project['uuid']}/").json()["data"] == project["data"]
    with SessionLocal() as db:
        assert db.query(PrivateVariable).count() == 1
        assert db.query(VariableAccess).filter_by(action="move").count() == 2


@pytest.mark.parametrize("move_account", [True, False])
def test_scope_conflicts_never_overwrite_either_saved_value(client, move_account):
    owner = register(client)
    project = make_project(client, owner)
    account = save_value(client, owner, value="account-value")
    override = save_value(
        client, owner, value="project-value", project_uuid=project["uuid"]
    )
    variable = account if move_account else override
    response = client.patch(
        f"/variables/{variable['id']}/",
        headers=headers(owner),
        json={
            "project_uuid": project["uuid"] if move_account else None,
            "value": "must-not-save",
        },
    )
    assert response.status_code == 409
    assert "already has a value" in response.text
    assert client.post(
        f"/variables/{account['id']}/reveal/", headers=headers(owner)
    ).json() == {"value": "account-value"}
    assert client.post(
        f"/variables/{override['id']}/reveal/", headers=headers(owner)
    ).json() == {"value": "project-value"}
    with SessionLocal() as db:
        assert db.query(PrivateVariable).count() == 2


def test_scope_edits_enforce_variable_and_destination_ownership(client):
    owner = register(client)
    other = register(client, "other@example.com")
    foreign_project = make_project(client, other)
    variable = save_value(client, owner)
    path = f"/variables/{variable['id']}/"
    assert client.patch(path, json={"project_uuid": None}).status_code == 401
    assert (
        client.patch(
            path, headers=headers(other), json={"value": "hijacked"}
        ).status_code
        == 404
    )
    assert (
        client.patch(
            path, headers=headers(owner), json={"project_uuid": foreign_project["uuid"]}
        ).status_code
        == 404
    )
    assert client.post(path + "reveal/", headers=headers(owner)).json() == {
        "value": "private-test-password"
    }


def test_scope_edit_failure_preserves_original_scope_and_ciphertext(
    client, monkeypatch
):
    owner = register(client)
    project = make_project(client, owner)
    variable = save_value(client, owner)
    path = f"/variables/{variable['id']}/"
    with SessionLocal() as db:
        original = db.query(PrivateVariable).one().encrypted_value
    monkeypatch.setenv("CTK_VARIABLE_KEYS", Fernet.generate_key().decode())
    assert (
        client.patch(
            path, headers=headers(owner), json={"project_uuid": project["uuid"]}
        ).status_code
        == 503
    )
    with SessionLocal() as db:
        row = db.query(PrivateVariable).one()
        assert row.scope_key == ""
        assert row.project_id is None
        assert row.encrypted_value == original


def test_scope_edit_can_explicitly_replace_with_an_empty_value(client):
    owner = register(client)
    project = make_project(client, owner)
    variable = save_value(client, owner)
    path = f"/variables/{variable['id']}/"
    response = client.patch(
        path,
        headers=headers(owner),
        json={"project_uuid": project["uuid"], "value": ""},
    )
    assert response.status_code == 200
    assert client.post(path + "reveal/", headers=headers(owner)).json() == {"value": ""}


def test_ordinary_variables_without_a_default_require_a_private_value(client):
    owner = register(client)
    project = client.post(
        "/projects/",
        headers=headers(owner),
        json={"data": {"variables": [{"name": "BASE_PATH", "secret": False}]}},
    ).json()
    response = client.post(f"/projects/{project['uuid']}/env/", headers=headers(owner))
    assert response.status_code == 400
    assert "BASE_PATH" in response.text


def test_migration_coexists_with_startup_schema_creation():
    import importlib.util
    from pathlib import Path
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import create_engine, inspect
    from database import Base
    from models import User

    database = create_engine("sqlite://")
    Base.metadata.create_all(bind=database, tables=[User.__table__, Project.__table__])
    path = (
        Path(__file__).parents[1] / "alembic/versions/b48b2242a890_private_variables.py"
    )
    spec = importlib.util.spec_from_file_location("private_variable_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with database.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            migration.upgrade()
            assert set(inspect(connection).get_table_names()) == {
                "users",
                "projects",
                "private_variables",
                "variable_access",
            }
            migration.downgrade()
            assert set(inspect(connection).get_table_names()) == {"users", "projects"}
    database.dispose()


def test_rejects_invalid_values_and_does_not_generate_unresolved_kubernetes(client):
    owner = register(client)
    for name, value in [
        ("bad-name", "valid"),
        ("OK", 123),
        ("OK", "a\x00b"),
        ("OK", "x" * 65537),
    ]:
        assert (
            client.put(
                f"/variables/{name}/", headers=headers(owner), json={"value": value}
            ).status_code
            == 400
        )
    response = client.post(
        "/generate/kubernetes",
        json={
            "data": {"services": {"db": {"environment": {"PASS": "${DB_PASSWORD}"}}}}
        },
    )
    assert response.json()["code"] == ""
    assert "cannot resolve Compose variables" in response.json()["error"]


@pytest.mark.skipif(not shutil.which("docker"), reason="Docker Compose CLI unavailable")
@pytest.mark.parametrize(
    "value",
    [
        "plain",
        "'single' and \"double\"",
        "back\\slash\\",
        "$HOME ${DO_NOT_EXPAND} $$literal",
        "one\ntwo\r\nthree\tfour",
        "שלום",
        "",
    ],
)
def test_exported_values_round_trip_through_docker_compose(tmp_path, value):
    from project_variables import dotenv_line

    (tmp_path / ".env").write_text(dotenv_line("VALUE", value))
    compose = tmp_path / "compose.yaml"
    compose.write_text(
        "services:\n  app:\n    image: alpine\n    environment:\n      VALUE: ${VALUE}\n"
    )
    environment = {key: item for key, item in os.environ.items() if key != "VALUE"}
    command = [
        "docker",
        "compose",
        "--project-name",
        "ctk-variable-test",
        "--env-file",
        str(tmp_path / ".env"),
        "-f",
        str(compose),
        "config",
    ]
    result = subprocess.run(
        [*command, "--format", "json"],
        capture_output=True,
        text=True,
        env=environment,
        timeout=15,
    )
    assert result.returncode == 0, result.stderr
    # `config` escapes dollars when re-serializing a runnable Compose document.
    assert json.loads(result.stdout)["services"]["app"]["environment"][
        "VALUE"
    ] == value.replace("$", "$$")
    resolved = subprocess.run(
        [*command, "--environment"], capture_output=True, env=environment, timeout=15
    )
    assert resolved.returncode == 0, resolved.stderr
    assert "VALUE=" + value + "\n" in resolved.stdout.decode()
