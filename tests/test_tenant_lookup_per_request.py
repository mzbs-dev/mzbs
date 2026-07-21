import pytest
from fastapi import HTTPException

import db


class DummyEngine:
    def __init__(self, conn_str: str):
        self.conn_str = conn_str

    def dispose(self):
        return None


def test_get_tenant_engine_rechecks_tenant_status_on_each_call(monkeypatch):
    call_count = 0

    def fake_lookup_tenant_connection(tenant_id: str) -> str:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return "postgresql://user:pass@localhost/db1"
        raise HTTPException(status_code=403, detail="School account is not active")

    monkeypatch.setattr(db, "_tenant_engines", {})
    monkeypatch.setattr(db, "_tenant_engine_conn_strs", {})
    monkeypatch.setattr(db, "_tenant_engine_last_used", {})
    monkeypatch.setattr(db, "lookup_tenant_connection", fake_lookup_tenant_connection)
    monkeypatch.setattr(db, "get_engine", lambda conn_str: DummyEngine(conn_str))

    first_engine = db.get_tenant_engine("tenant-123")
    assert first_engine.conn_str == "postgresql://user:pass@localhost/db1"

    with pytest.raises(HTTPException, match="School account is not active"):
        db.get_tenant_engine("tenant-123")

    assert call_count == 2
