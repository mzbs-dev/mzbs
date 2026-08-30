"""
test_concurrent_cross_tenant.py

Adversarial test from MULTI_TENANT_PLAN.md Phase 3, Day 5:
"Concurrent cross-tenant test: simultaneous requests as two different
tenants against the same endpoint, looped ~20 times -> confirm no data
crossover"

This fires interleaved concurrent requests for two different tenants
against the SAME app and asserts each response is scoped to the tenant
whose token made the request. It exercises the real db.get_tenant_engine()
engine cache + db._tenant_engine_lock under actual thread concurrency --
not a mock that sidesteps threading -- since that lock is exactly the
mechanism that's supposed to prevent one tenant's engine lookup from
corrupting another's cache entry.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

import db
from token_deps import ALGORITHM, SECRET_KEY

TENANT_CONN_STRINGS = {
    "tenant-a": "postgresql://user:pass@localhost/tenant-a-db",
    "tenant-b": "postgresql://user:pass@localhost/tenant-b-db",
}


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


@pytest.fixture
def app_with_protected_route(monkeypatch):
    app = FastAPI()

    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        return TENANT_CONN_STRINGS[tenant_id]

    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", lambda conn_str: DummyEngine(conn_str))
    monkeypatch.setattr(db, "SessionLocal", lambda engine: DummySession(engine))
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    @app.get("/protected")
    def protected(session=Depends(db.get_session)):
        # Report which tenant DB this specific request's session is
        # actually connected to -- this is the value that must never
        # cross over between concurrent requests for different tenants.
        return {"connected_to": session.engine.conn_str}

    return app


def test_concurrent_requests_never_receive_another_tenants_connection(
    app_with_protected_route,
):
    app = app_with_protected_route

    token_a = jwt.encode(
        {"sub": "admin-a", "tenant_id": "tenant-a"}, SECRET_KEY, algorithm=ALGORITHM
    )
    token_b = jwt.encode(
        {"sub": "admin-b", "tenant_id": "tenant-b"}, SECRET_KEY, algorithm=ALGORITHM
    )

    results = []
    errors = []

    with TestClient(app) as client:

        def make_request(token: str, expected_tenant: str):
            try:
                response = client.get(
                    "/protected", headers={"Authorization": f"Bearer {token}"}
                )
                results.append((expected_tenant, response.status_code, response.json()))
            except Exception as exc:  # pragma: no cover - failure path only
                errors.append(exc)

        # Interleave tenant-a and tenant-b requests across 20 rounds,
        # fired concurrently within each round via a thread pool,
        # mirroring the plan's "looped ~20 times" requirement.
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = []
            for _ in range(20):
                futures.append(executor.submit(make_request, token_a, "tenant-a"))
                futures.append(executor.submit(make_request, token_b, "tenant-b"))
            for future in as_completed(futures):
                future.result()

    assert not errors, f"Unexpected exceptions during concurrent requests: {errors}"
    assert len(results) == 40

    for expected_tenant, status_code, body in results:
        assert status_code == 200
        expected_conn_str = TENANT_CONN_STRINGS[expected_tenant]
        assert body["connected_to"] == expected_conn_str, (
            f"CROSS-TENANT LEAK: a request authenticated as '{expected_tenant}' "
            f"received a session connected to '{body['connected_to']}' instead "
            f"of the expected '{expected_conn_str}'"
        )


def test_new_tenant_first_seen_under_concurrent_load_caches_correctly(monkeypatch):
    """A brand-new tenant_id hit by many concurrent requests simultaneously
    (e.g. right after a new school's frontend deploys and its first users
    log in together) must resolve to exactly one cached engine, not race
    into a corrupted or duplicated cache entry. Mirrors MULTI_TENANT_PLAN's
    Phase 2 Day 4 check: '20 concurrent calls for a brand-new tenant_id ->
    no crash, no corrupted cache entry.'"""
    app = FastAPI()
    engines_created = {"count": 0}

    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        return "postgresql://user:pass@localhost/brand-new-tenant-db"

    def fake_get_engine(conn_str: str) -> DummyEngine:
        engines_created["count"] += 1
        return DummyEngine(conn_str)

    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", fake_get_engine)
    monkeypatch.setattr(db, "SessionLocal", lambda engine: DummySession(engine))
    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})

    @app.get("/protected")
    def protected(session=Depends(db.get_session)):
        return {"connected_to": session.engine.conn_str}

    token = jwt.encode(
        {"sub": "admin", "tenant_id": "brand-new-tenant"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    with TestClient(app) as client:
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(
                    client.get,
                    "/protected",
                    headers={"Authorization": f"Bearer {token}"},
                )
                for _ in range(20)
            ]
            responses = [f.result() for f in as_completed(futures)]

    assert all(r.status_code == 200 for r in responses)
    assert all(
        r.json()["connected_to"] == "postgresql://user:pass@localhost/brand-new-tenant-db"
        for r in responses
    )
    # The whole point of the _tenant_engine_lock: 20 concurrent first-touch
    # requests for the same new tenant should create the engine ONCE, not
    # 20 times racing each other.
    assert engines_created["count"] == 1
