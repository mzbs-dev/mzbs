"""
test_cold_start_tenant_resolution.py

Adversarial test from MULTI_TENANT_PLAN.md Phase 3, Day 5:
"Cold-start test: restart backend (clears engine cache), confirm correct
tenant resolves on the very first request"

An actual process restart can't be simulated in-process, but the *effect*
of one can: db._tenant_engines / db._tenant_engine_conn_strs /
db._tenant_engine_last_used all start as empty dicts at import time,
before any request has ever been served. This test forces that exact
state and asserts the very first call against a cold cache resolves the
correct tenant on the first attempt -- with no dependency on any prior
"warm-up" request that a real restart wouldn't have the luxury of.
"""
from fastapi import Depends, FastAPI
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


def test_first_request_after_cold_start_resolves_correct_tenant(monkeypatch):
    lookup_calls = []

    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        lookup_calls.append(tenant_id)
        return f"postgresql://user:pass@localhost/{tenant_id}-db"

    # Simulate the exact state db.py is in right after a fresh process
    # start -- no engines cached, no "last used" bookkeeping, nothing
    # warmed up by a prior request. This is what evict_idle_tenant_engines()
    # and the engine-cache lookup inside get_tenant_engine() see on the
    # very first call of a new process.
    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", lambda conn_str: DummyEngine(conn_str))
    monkeypatch.setattr(db, "SessionLocal", lambda engine: DummySession(engine))
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    app = FastAPI()

    @app.get("/protected")
    def protected(session=Depends(db.get_session)):
        return {"connected_to": session.engine.conn_str}

    with TestClient(app) as client:
        token = jwt.encode(
            {"sub": "admin", "tenant_id": "tenant-cold-start"},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        response = client.get(
            "/protected", headers={"Authorization": f"Bearer {token}"}
        )

    assert response.status_code == 200
    assert (
        response.json()["connected_to"]
        == "postgresql://user:pass@localhost/tenant-cold-start-db"
    )
    # Exactly one lookup call -- the first request must resolve
    # immediately, not require a discarded "warm-up" call first.
    assert lookup_calls == ["tenant-cold-start"]
    assert "tenant-cold-start" in db._tenant_engines


def test_second_tenants_cold_first_request_does_not_disturb_an_already_warm_tenant(
    monkeypatch,
):
    """A cold start isn't just 'the first request ever' -- it's also what
    happens when tenant #2 is hit for the first time while tenant #1's
    engine is already cached and warm. Confirms the new tenant's cold
    lookup doesn't evict or corrupt the already-cached tenant's entry."""
    conn_strings = {
        "tenant-warm": "postgresql://user:pass@localhost/tenant-warm-db",
        "tenant-cold": "postgresql://user:pass@localhost/tenant-cold-db",
    }

    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        return conn_strings[tenant_id]

    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", lambda conn_str: DummyEngine(conn_str))
    monkeypatch.setattr(db, "SessionLocal", lambda engine: DummySession(engine))
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    # Warm tenant-warm up first.
    warm_engine = db.get_tenant_engine("tenant-warm")
    assert warm_engine.conn_str == conn_strings["tenant-warm"]

    # Now hit tenant-cold for the first time.
    cold_engine = db.get_tenant_engine("tenant-cold")
    assert cold_engine.conn_str == conn_strings["tenant-cold"]

    # tenant-warm's cached engine must be untouched -- same object, not
    # recreated, not evicted as a side effect of tenant-cold's first hit.
    assert db.get_tenant_engine("tenant-warm") is warm_engine
