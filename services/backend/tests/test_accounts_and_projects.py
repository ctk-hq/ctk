import os

os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/ctk-test.sqlite3")
os.environ.setdefault(
    "JWT_SECRET", "test-signing-secret-that-is-at-least-32-characters"
)
os.environ.setdefault("CORS_ORIGINS", "https://www.containertoolkit.io")

import pytest
from fastapi.testclient import TestClient

from app import app
from database import Base, engine, _default_database_url


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as client:
        yield client
    Base.metadata.drop_all(bind=engine)


def register(client, email="owner@example.com"):
    response = client.post(
        "/auth/registration/",
        json={
            "email": email,
            "password1": "safe-password-123",
            "password2": "safe-password-123",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def headers(account):
    return {"Authorization": f"Bearer {account['access_token']}"}


def test_email_registration_login_and_refresh(client):
    account = register(client, "Owner@Example.com")
    assert account["user"]["email"] == "owner@example.com"
    assert "password_hash" not in account["user"]
    login = client.post(
        "/auth/login/",
        json={"email": "OWNER@example.com", "password": "safe-password-123"},
    )
    assert login.status_code == 200
    assert (
        client.get("/auth/self/", headers=headers(login.json())).json()["email"]
        == "owner@example.com"
    )
    assert (
        client.post(
            "/auth/token/refresh/", json={"refresh": account["refresh_token"]}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/token/refresh/", json={"refresh": account["access_token"]}
        ).status_code
        == 401
    )


def test_invalid_and_duplicate_accounts(client):
    register(client)
    for email, password in [
        ("owner@example.com", "safe-password-123"),
        ("not-an-email", "safe-password-123"),
        ("new@example.com", "short"),
    ]:
        response = client.post(
            "/auth/registration/",
            json={"email": email, "password1": password, "password2": password},
        )
        assert response.status_code == 400
    assert (
        client.post(
            "/auth/login/", json={"email": "owner@example.com", "password": "wrong"}
        ).status_code
        == 400
    )


def test_save_list_rename_reload_and_delete_owned_projects(client):
    owner = register(client)
    payload = {
        "name": "My stack",
        "visibility": 0,
        "data": {"canvas": {"nodes": {"web": {"image": "nginx"}}}},
    }
    created = client.post("/projects/", json=payload, headers=headers(owner))
    assert created.status_code == 201
    project = created.json()
    assert project["owner_id"] == owner["user"]["pk"]
    assert (
        client.get("/projects/", headers=headers(owner)).json()["results"][0]["uuid"]
        == project["uuid"]
    )
    path = f"/projects/{project['uuid']}/"
    assert (
        client.put(path, json={"name": "Renamed"}, headers=headers(owner)).status_code
        == 200
    )
    assert client.get(path, headers=headers(owner)).json()["name"] == "Renamed"
    assert client.delete(path, headers=headers(owner)).status_code == 204
    assert client.get(path, headers=headers(owner)).status_code == 404


def test_anonymous_and_other_users_cannot_access_private_projects(client):
    owner = register(client)
    other = register(client, "other@example.com")
    project = client.post(
        "/projects/", json={"name": "Private", "visibility": 0}, headers=headers(owner)
    ).json()
    path = f"/projects/{project['uuid']}/"
    assert client.get("/projects/").status_code == 401
    assert client.post("/projects/", json={"name": "Anonymous"}).status_code == 401
    assert client.get(path).status_code == 404
    assert client.put(path, json={"name": "Hijacked"}).status_code == 401
    assert client.delete(path).status_code == 401
    assert client.get("/projects/", headers=headers(other)).json()["count"] == 0
    for method in [client.get, client.put, client.delete]:
        assert method(path, headers=headers(other)).status_code == 404


def test_public_projects_are_readable_but_only_owner_can_write(client):
    owner = register(client)
    other = register(client, "other@example.com")
    project = client.post(
        "/projects/", json={"name": "Public", "visibility": 1}, headers=headers(owner)
    ).json()
    path = f"/projects/{project['uuid']}/"
    assert client.get(path).status_code == 200
    assert (
        client.put(path, json={"name": "Hijacked"}, headers=headers(other)).status_code
        == 404
    )


def test_health_and_frontend_cors(client):
    assert client.get("/health").json() == {"status": "ok"}
    for origin, status in [
        ("https://www.containertoolkit.io", 200),
        ("https://untrusted.example.com", 400),
    ]:
        response = client.options(
            "/auth/login/",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
        )
        assert response.status_code == status


def test_rds_passwords_are_not_interpreted_as_url_syntax(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("POSTGRES_PASSWORD", "a:b@c/d?e#f%g")
    monkeypatch.setenv("POSTGRES_SSLMODE", "require")
    url = _default_database_url()
    assert url.password == "a:b@c/d?e#f%g"
    assert url.query["sslmode"] == "require"
