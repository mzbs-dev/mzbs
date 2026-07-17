"""
migrations/run_log_service.py

Writes one row per (tenant, migration) outcome to the control-plane
`migration_run_log` table (Phase 4, Day 5). Lives under migrations/ rather
than control_plane/ because it's only ever called from the runner — but it
writes to the control-plane DB, not the tenant DB.

Add the MigrationRunLog model below to control_plane/models.py, and add
a migration for the table itself to the *control plane's own* schema
(this table lives in mzbs-control-plane / mzbs-staging-control-plane,
not in any tenant DB).
"""

from datetime import datetime, timezone
from typing import Literal

from sqlmodel import text

from db import get_control_plane_session

RunStatus = Literal["applied", "skipped", "failed"]


def write_migration_run_log(
    tenant_id: str,
    migration_id: str,
    status: RunStatus,
    error_detail: str | None = None,
) -> None:
    """Best-effort audit write. Deliberately swallows its own errors —
    a logging failure should never mask or replace the real migration
    result that's already been printed to stdout and returned to the caller.
    """
    try:
        with get_control_plane_session() as session:
            session.exec(
                text(
                    """
                    INSERT INTO migration_run_log
                        (migration_id, tenant_id, status, error_detail, run_at)
                    VALUES
                        (:migration_id, :tenant_id, :status, :error_detail, :run_at)
                    """
                ),
                {
                    "migration_id": migration_id,
                    "tenant_id": tenant_id,
                    "status": status,
                    "error_detail": error_detail,
                    "run_at": datetime.now(timezone.utc),
                },
            )
            session.commit()
    except Exception as e:  # noqa: BLE001
        print(
            f"    (warning: failed to write migration_run_log for "
            f"{tenant_id}/{migration_id}: {e})"
        )
