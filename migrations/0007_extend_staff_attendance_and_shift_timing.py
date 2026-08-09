"""
Migration script for Phase 2 of the Staff Profile / Self-Attendance /
Attendance Review feature (see STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md).

Three additive, non-destructive changes to each tenant DB:

1. `staffattendance` gains 10 new nullable columns (self-report +
   finalization fields) and `attendance_status` is relaxed from NOT NULL
   to nullable (it's deprecated — new code must never write it, so it can
   no longer be required).
2. New table `staff_shift_assignment` is created (many-to-many staff <-> shift).
3. New table `attendance_time_shift_config` is created — a 1:1 extension of
   `attendancetime` holding expected_arrival_time/expected_departure_time,
   keyed on attendance_time_id. `attendancetime` itself is NOT altered:
   it's a shared table also read by student attendance, dashboard
   aggregation, and mark-attendance, so this feature's new fields live in
   a separate table instead of adding columns there (see Locked Design
   Decisions, "Shift timing storage" — revised from the original plan,
   which called for extending attendancetime directly).

Then a one-time data-migration step back-fills every EXISTING staffattendance
row (i.e. every row that predates this migration) so it reads correctly under
the new final_status/is_finalized model:
    final_status = attendance_status   (mapped; "Unmarked" -> NULL)
    is_finalized = True                (existing rows are already admin-set)
    self_* fields stay NULL            (no self-report ever existed for them)

The backfill only touches rows where final_status IS NULL, so it is safe to
re-run: rows already migrated (or created fresh post-migration by the new
self-attendance/finalize routes, which set final_status themselves when
finalized, or leave it NULL while genuinely pending review) are left alone.
Note: a freshly self-reported-but-not-yet-finalized row created by Phase 3
code AFTER this migration has run will also have final_status IS NULL — but
by the time Phase 3/4 routers exist, this migration will already have run
once and finished backfilling all the truly-historical rows, so a second
run is a no-op in practice (0 rows match `attendance_status IS NOT NULL AND
final_status IS NULL`, since post-migration self-attendance rows never
populate attendance_status at all).

No destructive drops in this migration, and no DDL at all against the
shared `attendancetime` table. `attendance_status` itself is left in place
on staffattendance — see the deprecation note in
schemas/staff_attendance_model.py and the Post-Launch Notes in the plan doc
for its eventual removal.

Run via the fan-out runner (recommended):
    uv run python -m migrations.run_all_tenants --dry-run --only 0007_extend_staff_attendance_and_shift_timing
    uv run python -m migrations.run_all_tenants --only 0007_extend_staff_attendance_and_shift_timing --tenant mzbs_staging_school
    uv run python -m migrations.run_all_tenants --only 0007_extend_staff_attendance_and_shift_timing --tenant mzbs

Or standalone (falls back to setting.DATABASE_URL if --database-url is omitted):
    uv run python -m migrations.0007_extend_staff_attendance_and_shift_timing
"""

import argparse

from sqlmodel import Session, SQLModel, create_engine, text
import setting

from schemas.attendance_time_model import AttendanceTime
from schemas.staff_shift_assignment_model import StaffShiftAssignment
from schemas.attendance_time_shift_config_model import AttendanceTimeShiftConfig
from schemas.teacher_names_model import TeacherNames

MIGRATION_ID = "0007_extend_staff_attendance_and_shift_timing"

# ─── DDL ─────────────────────────────────────────────────────────────────────

STAFFATTENDANCE_COLUMNS_SQL = """
ALTER TABLE staffattendance ALTER COLUMN attendance_status DROP NOT NULL;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS self_availability VARCHAR;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS self_remarks VARCHAR;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS arrival_time TIME;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS departure_time TIME;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS self_submitted_at TIMESTAMP;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS final_status VARCHAR;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS final_remarks VARCHAR;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS finalized_by INTEGER REFERENCES "user"(id);
ALTER TABLE staffattendance ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS ix_staffattendance_final_status ON staffattendance (final_status);
CREATE INDEX IF NOT EXISTS ix_staffattendance_is_finalized ON staffattendance (is_finalized);
"""

BACKFILL_SQL = """
UPDATE staffattendance
SET final_status = CASE
        WHEN attendance_status IS NULL THEN NULL
        WHEN attendance_status = 'Unmarked' THEN NULL
        ELSE attendance_status
    END,
    is_finalized = TRUE
WHERE final_status IS NULL
  AND attendance_status IS NOT NULL;
"""


def add_staffattendance_columns(session: Session) -> None:
    print("Extending staffattendance (self-report + finalization columns)...")
    for stmt in STAFFATTENDANCE_COLUMNS_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            session.exec(text(stmt))
    print("✓ staffattendance columns ready")


def create_staff_shift_assignment_table(bind) -> None:
    print("Creating staff_shift_assignment table (if not exists)...")
    # Include referenced tables so FK targets are available to SQLAlchemy.
    SQLModel.metadata.create_all(
        bind,
        tables=[TeacherNames.__table__, AttendanceTime.__table__, StaffShiftAssignment.__table__],
    )
    print("✓ staff_shift_assignment table ready")


def create_attendance_time_shift_config_table(bind) -> None:
    print("Creating attendance_time_shift_config table (if not exists)...")
    print("  (no DDL against attendancetime itself — see module docstring)")
    SQLModel.metadata.create_all(
        bind,
        tables=[AttendanceTime.__table__, AttendanceTimeShiftConfig.__table__],
    )
    print("✓ attendance_time_shift_config table ready")


def backfill_final_status(session: Session) -> int:
    print("Backfilling final_status/is_finalized on pre-existing staffattendance rows...")
    result = session.exec(text(BACKFILL_SQL))
    # rowcount is available on the underlying CursorResult
    count = result.rowcount if hasattr(result, "rowcount") else -1
    print(f"✓ Backfill complete: {count} row(s) updated")
    return count


def print_summary(session: Session) -> None:
    cols = session.exec(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'staffattendance' ORDER BY column_name"
        )
    ).all()
    col_names = sorted(c[0] for c in cols)
    expected_new = {
        "self_availability", "self_remarks", "arrival_time", "departure_time",
        "self_submitted_at", "final_status", "final_remarks", "is_finalized",
        "finalized_by", "finalized_at",
    }
    missing = expected_new - set(col_names)
    if missing:
        print(f"⚠️  Missing expected columns on staffattendance: {missing}")
    else:
        print("✓ All 10 new staffattendance columns present")

    tables = session.exec(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    ).all()
    table_names = {t[0] for t in tables}
    for expected_table in ("staff_shift_assignment", "attendance_time_shift_config"):
        if expected_table in table_names:
            print(f"✓ {expected_table} table present")
        else:
            print(f"⚠️  {expected_table} table NOT found — investigate")


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py.

    Does not commit. runner_core.py's apply_migration() commits the
    upgrade and the schema_migrations tracking row together, atomically.
    All DDL here is additive-only (ADD COLUMN IF NOT EXISTS / CREATE TABLE
    IF NOT EXISTS / CREATE INDEX IF NOT EXISTS) or a constraint relaxation
    (DROP NOT NULL) — and none of it touches attendancetime — so safe to
    re-run.
    """
    add_staffattendance_columns(session)
    create_staff_shift_assignment_table(session.connection())
    create_attendance_time_shift_config_table(session.connection())
    backfill_final_status(session)


def main():
    parser = argparse.ArgumentParser(
        description="Extend staffattendance + create staff_shift_assignment / attendance_time_shift_config"
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Target DB connection string. Defaults to setting.DATABASE_URL (local .env) if omitted.",
    )
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})

    with Session(engine) as session:
        add_staffattendance_columns(session)
        create_staff_shift_assignment_table(session.connection())
        create_attendance_time_shift_config_table(session.connection())
        backfill_final_status(session)
        session.commit()
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("STAFF ATTENDANCE + SHIFT TIMING SCHEMA MIGRATION (Phase 2)")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Add 10 new columns to staffattendance + relax attendance_status to nullable")
    print("2. Create staff_shift_assignment table")
    print("3. Create attendance_time_shift_config table (no changes to attendancetime)")
    print("4. Backfill final_status/is_finalized on existing staffattendance rows")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()

