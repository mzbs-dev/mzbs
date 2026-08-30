"""
test_malformed_missing_claims.py

Adversarial test from MULTI_TENANT_PLAN.md Phase 3, Day 5:
"Missing/malformed claim test: no tenant_id, empty string, nonexistent
slug -> expect clean 401/404, never a 500"

Exercises token_deps.get_token_payload() directly for the claim-validation
cases (missing/empty tenant_id, missing/empty username), and the full
db.get_session() chain for the "nonexistent tenant" case -- which is a
lookup failure, not a claim-validation failure, and goes through a
different code path (lookup_tenant_connection raising 404).

Note on the empty-string case: token_deps.get_token_payload() uses
`if not username or not tenant_id`, so an empty string "" is treated
identically to a missing claim -- both produce "Token missing required
claims", not a separate error. This test asserts that actual behavior
rather than assuming a distinct empty-string error path exists.
"""
import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

import db
from token_deps import ALGORITHM, SECRET_KEY


@pytest.fixture
def app_with_protected_route():
    app = FastAPI()

    @app.get("/protected")
    def protected(session=Depends(db.get_session)):
        return {"ok": True}

    return app


def _sign(payload: dict) -> str:
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@pytest.mark.parametrize(
    "payload,description",
    [
        ({"sub": "admin"}, "tenant_id claim absent entirely"),
        ({"sub": "admin", "tenant_id": ""}, "tenant_id present but empty string"),
        ({"tenant_id": "tenant-a"}, "sub/username claim absent entirely"),
        ({"sub": "", "tenant_id": "tenant-a"}, "sub present but empty string"),
        ({}, "neither claim present"),
    ],
)
def test_missing_or_empty_claims_return_clean_401_not_500(
    app_with_protected_route, payload, description
):
    token = _sign(payload)

    with TestClient(app_with_protected_route) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401, f"Failed case: {description}"
    assert "Token missing required claims" in response.text, f"Failed case: {description}"


def test_nonexistent_tenant_slug_returns_clean_404_not_500(
    app_with_protected_route, monkeypatch
):
    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        raise HTTPException(status_code=404, detail="Unknown school")

    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    token = _sign({"sub": "admin", "tenant_id": "school-that-does-not-exist"})

    with TestClient(app_with_protected_route) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 404
    assert "Unknown school" in response.text


def test_no_token_at_all_returns_clean_401_not_500(app_with_protected_route):
    with TestClient(app_with_protected_route) as client:
        response = client.get("/protected")

    assert response.status_code == 401
    assert "no token provided" in response.text


def test_garbage_non_jwt_token_returns_clean_401_not_500(app_with_protected_route):
    """A string that isn't a JWT at all (e.g. a corrupted cookie, or an
    attacker just sending noise) must be rejected cleanly by jose's
    decode step, not crash the request."""
    with TestClient(app_with_protected_route) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer not.a.real.jwt.token"},
        )

    assert response.status_code == 401
    assert "Could not validate credentials" in response.text
