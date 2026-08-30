"""
test_tampered_jwt_signature.py

Adversarial test from MULTI_TENANT_PLAN.md Phase 3, Day 5:
"Tampered token test: change tenant_id in a decoded token without
re-signing -> expect 401"

Verifies that jose's signature check in token_deps.get_token_payload()
rejects any token whose payload was modified after signing, and that this
rejection happens BEFORE tenant resolution -- db.lookup_tenant_connection
must never be called for a token with a bad signature. A signature-only
tamper detector that still leaked into tenant lookup would defeat the
point of the check.
"""
import base64
import json

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

import db
from token_deps import ALGORITHM, SECRET_KEY


def _tamper_payload(token: str, **overrides) -> str:
    """Take a validly-signed JWT and rewrite its payload segment in place,
    WITHOUT re-signing -- this produces a token whose signature no longer
    matches its payload, simulating an attacker editing a captured token
    (e.g. changing tenant_id to someone else's school)."""
    header_b64, payload_b64, signature_b64 = token.split(".")

    def _b64url_decode(segment: str) -> bytes:
        padding = "=" * (-len(segment) % 4)
        return base64.urlsafe_b64decode(segment + padding)

    def _b64url_encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    payload = json.loads(_b64url_decode(payload_b64))
    payload.update(overrides)
    new_payload_b64 = _b64url_encode(json.dumps(payload).encode())

    # Signature segment is left untouched -- it was computed over the
    # ORIGINAL header+payload, so it will no longer verify against the
    # modified payload.
    return f"{header_b64}.{new_payload_b64}.{signature_b64}"


class DummyEngine:
    def dispose(self):
        return None


class DummySession:
    def __init__(self, engine):
        pass

    def close(self):
        return None


@pytest.fixture
def protected_app(monkeypatch):
    app = FastAPI()
    lookup_called = {"count": 0}

    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        lookup_called["count"] += 1
        return "postgresql://user:pass@localhost/should-never-be-reached"

    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", lambda conn_str: DummyEngine())
    monkeypatch.setattr(db, "SessionLocal", lambda engine: DummySession(engine))
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    @app.get("/protected")
    def protected(session=Depends(db.get_session)):
        return {"ok": True}

    return app, lookup_called


def test_tampered_tenant_id_claim_is_rejected_with_401(protected_app):
    app, lookup_called = protected_app

    genuine_token = jwt.encode(
        {"sub": "admin", "tenant_id": "tenant-a"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    tampered_token = _tamper_payload(genuine_token, tenant_id="tenant-b")
    assert tampered_token != genuine_token

    with TestClient(app) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )

    assert response.status_code == 401
    assert "Could not validate credentials" in response.text
    # Signature check must fail BEFORE tenant resolution ever runs -- a
    # tampered token should never reach lookup_tenant_connection at all.
    assert lookup_called["count"] == 0


def test_tampered_username_claim_is_also_rejected(protected_app):
    app, lookup_called = protected_app

    genuine_token = jwt.encode(
        {"sub": "teacher1", "tenant_id": "tenant-a"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    tampered_token = _tamper_payload(genuine_token, sub="admin")

    with TestClient(app) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )

    assert response.status_code == 401
    assert lookup_called["count"] == 0


def test_genuinely_re_signed_token_with_different_tenant_is_accepted(protected_app):
    """Sanity control: a token that IS properly re-signed with a new
    tenant_id must succeed. This proves the two rejections above are
    really about the broken signature, not some unrelated bug that
    happens to also return 401."""
    app, lookup_called = protected_app

    valid_token = jwt.encode(
        {"sub": "admin", "tenant_id": "tenant-b"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    with TestClient(app) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {valid_token}"},
        )

    assert response.status_code == 200
    assert lookup_called["count"] == 1
