"""
control_plane/migration_run_log_table.py

Run this ONCE, by hand, against the control-plane database (staging first,
then production at cutover) to create the migration_run_log table. This
table lives in the control plane, not in tenant DBs, so it's outside the
per-tenant runner in run_all_tenants.py.

    uv run python -c "
        from control_plane.db import get_control_plane_session
        from control_plane.migration_run_log_table import upgrade
        with get_control_plane_session() as s:
            upgrade(s)
    "

Also add the SQLModel class below to control_plane/models.py so the rest
of the codebase (e.g. a future Super-Admin panel view of migration health)
can query it with the ORM instead of raw SQL.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel, Session, text


def upgrade(session: Session) -> None:
    session.exec(
        text(
            """
            CREATE TABLE IF NOT EXISTS migration_run_log (
                id SERIAL PRIMARY KEY,
                migration_id VARCHAR NOT NULL,
                tenant_id VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                error_detail TEXT,
                run_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    # Helpful for the "check migration_run_log for failed rows" step in the
    # runbook, and for a future Super-Admin dashboard filtering by tenant.
    session.exec(
        text(
            "CREATE INDEX IF NOT EXISTS idx_migration_run_log_status "
            "ON migration_run_log (status)"
        )
    )
    session.exec(
        text(
            "CREATE INDEX IF NOT EXISTS idx_migration_run_log_tenant "
            "ON migration_run_log (tenant_id)"
        )
    )
    session.commit()


# --- Add this class to control_plane/models.py ---
class MigrationRunLog(SQLModel, table=True):
    __tablename__ = "migration_run_log"

    id: int | None = Field(default=None, primary_key=True)
    migration_id: str
    tenant_id: str
    status: str  # "applied" | "skipped" | "failed"
    error_detail: str | None = None
    run_at: datetime = Field(default_factory=datetime.utcnow)
