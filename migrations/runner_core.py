"""
migrations/runner_core.py

Lightweight per-tenant migration tracking (Phase 4, Day 1-2).

Each tenant database gets its own `schema_migrations` table. This module
only knows how to talk to ONE database session at a time — it has no
knowledge of tenants, the control plane, or looping. That's run_all_tenants.py's
job. Keeping this split means these functions are trivially testable against
a single Session in isolation.
"""

from datetime import datetime, timezone
from types import ModuleType

from sqlmodel import Session, text


def ensure_migrations_table(session: Session) -> None:
    """Create schema_migrations in the current tenant DB if it doesn't exist yet.

    Safe to call on every run — CREATE TABLE IF NOT EXISTS is idempotent.
    """
    session.exec(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_id VARCHAR UNIQUE NOT NULL,
                applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    session.commit()


def get_applied_migrations(session: Session) -> set[str]:
    """Return the set of migration_id values already applied to this tenant DB."""
    rows = session.exec(text("SELECT migration_id FROM schema_migrations")).all()
    # rows come back as Row objects (or tuples) depending on driver — normalize
    return {row[0] for row in rows}


def apply_migration(session: Session, module: ModuleType) -> None:
    """Run one migration module's upgrade(session) and record it as applied.

    `module` must expose:
      - MIGRATION_ID: str
      - upgrade(session: Session) -> None

    The upgrade + the tracking-row insert happen in the same transaction
    intentionally: if upgrade() raises, the insert never happens, so a
    partially-failed migration is correctly left unmarked and will be
    retried on the next run rather than silently skipped.
    """
    module.upgrade(session)
    session.exec(
        text(
            "INSERT INTO schema_migrations (migration_id, applied_at) "
            "VALUES (:mid, :applied_at)"
        ),
        {"mid": module.MIGRATION_ID, "applied_at": datetime.now(timezone.utc)},
    )
    session.commit()
