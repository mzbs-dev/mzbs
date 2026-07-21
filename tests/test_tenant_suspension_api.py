from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

import db
from token_deps import ALGORITHM, SECRET_KEY


class DummyEngine:
    def __init__(self, conn_str: str):
        self.conn_str = conn_str

    def dispose(self):
        return None


class DummySession:
    def __init__(self, engine):
        self.engine = engine

    def close(self):
        return None


def test_suspended_tenant_is_rejected_on_second_authenticated_request(monkeypatch):
    app = FastAPI()

    @app.get("/protected")
    def protected(session=Depends(db.get_session)):
        return {"ok": True}

    lookup_calls = {"count": 0}

    def fake_lookup_tenant_connection(tenant_id: str):
        lookup_calls["count"] += 1
        if lookup_calls["count"] == 1:
            return "postgresql://user:pass@localhost/tenant-db"
        raise HTTPException(status_code=403, detail="School account is not active")

    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", lambda conn_str: DummyEngine(conn_str))
    monkeypatch.setattr(db, "SessionLocal", lambda engine: DummySession(engine))
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    token = jwt.encode(
        {"sub": "admin", "tenant_id": "tenant-123"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    with TestClient(app) as client:
        first_response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert first_response.status_code == 200

        second_response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert second_response.status_code == 403
