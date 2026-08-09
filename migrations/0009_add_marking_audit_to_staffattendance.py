"""
Migration 0009 — Admin-assisted self-attendance audit trail.

Adds two nullable columns to `staffattendance`:
    marked_by_user_id  -> user.id   (who actually performed the write)
    attendance_source                "SELF" / "ADMIN_ASSISTED", set once at
                                      creation, never changed by later edits

Supports the confirmed "Staff Self-Attendance & Admin-Assisted Attendance"
refinement: staff without login access can have their daily self-attendance
entered by ADMIN/CHIEF_PRINCIPAL via POST /self-attendance/for-staff/{staff_id}
(router/self_attendance.py), gated by require_permission('attendance_review','add').
That route is TODAY-ONLY and blocked once is_finalized = true — historical
corrections and finalized-record edits go through Attendance Review's PATCH,
never through this route (locked decision, see plan doc discussion).

attendance_source is a plain nullable VARCHAR (validated in Python at the
router layer), consistent with how self_availability/final_status are
already handled on this table — no DB-level enum type.

Additive only. Safe to re-run.

Run via the fan-out runner:
    uv run python -m migrations.run_all_tenants --dry-run --only 0009_add_marking_audit_to_staffattendance
    uv run python -m migrations.run_all_tenants --only 0009_add_marking_audit_to_staffattendance --tenant mzbs_staging_school
    uv run python -m migrations.run_all_tenants --only 0009_add_marking_audit_to_staffattendance --tenant mzbs
"""

import argparse

from sqlmodel import Session, create_engine, text
import setting

MIGRATION_ID = "0009_add_marking_audit_to_staffattendance"

DDL_SQL = """
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS marked_by_user_id INTEGER
    REFERENCES "user"(id);
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS attendance_source VARCHAR;
CREATE INDEX IF NOT EXISTS ix_staffattendance_marked_by_user_id ON staffattendance (marked_by_user_id);
CREATE INDEX IF NOT EXISTS ix_staffattendance_attendance_source ON staffattendance (attendance_source);
"""


def add_marking_audit_columns(session: Session) -> None:
    print("Adding marked_by_user_id + attendance_source to staffattendance...")
    for stmt in DDL_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            session.exec(text(stmt))
    print("✓ staffattendance marking-audit columns ready")


def print_summary(session: Session) -> None:
    cols = session.exec(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'staffattendance' "
            "AND column_name IN ('marked_by_user_id', 'attendance_source')"
        )
    ).all()
    found = {c[0] for c in cols}
    expected = {"marked_by_user_id", "attendance_source"}
    missing = expected - found
    if missing:
        print(f"⚠️  Missing expected columns: {missing}")
    else:
        print("✓ Both new columns present")


def upgrade(session: Session) -> None:
    """Entry point for migrations/run_all_tenants.py. Does not commit."""
    add_marking_audit_columns(session)


def main():
    parser = argparse.ArgumentParser(description="Add marking-audit columns to staffattendance")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})
    with Session(engine) as session:
        add_marking_audit_columns(session)
        session.commit()
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("STAFFATTENDANCE MARKING-AUDIT COLUMNS (Phase 2 follow-up)")
    print("=" * 60)
    print("\nAdds marked_by_user_id + attendance_source (both nullable).")
    print("Press Ctrl+C to cancel, or Enter to continue...")
    input()
    main()