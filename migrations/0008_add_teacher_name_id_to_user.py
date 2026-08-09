"""
Migration 0008 — Link User accounts to TeacherNames (staff identity).

Adds a single nullable, unique FK column to `user`:
    teacher_name_id -> teachernames.teacher_name_id

Design (confirmed decision, see STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md
follow-up discussion, "User <-> TeacherNames identity linkage"):
- One User account maps to at most one TeacherNames row (unique constraint).
- Two User accounts can never point at the same staff record (no shared logins).
- NOT backfilled automatically. Existing rows are left NULL — matching by
  username/teacher_name string similarity was explicitly rejected as unsafe.
  An admin links accounts manually (or via a future read-only matching
  report) after this migration runs.
- A User with teacher_name_id = NULL cannot use any self_attendance route
  (see get_current_staff() in router/self_attendance.py) — returns a clean
  403, never infers identity.

Additive only. No destructive changes. Safe to re-run.

Run via the fan-out runner:
    uv run python -m migrations.run_all_tenants --dry-run --only 0008_add_teacher_name_id_to_user
    uv run python -m migrations.run_all_tenants --only 0008_add_teacher_name_id_to_user --tenant mzbs_staging_school
    uv run python -m migrations.run_all_tenants --only 0008_add_teacher_name_id_to_user --tenant mzbs
"""

import argparse

from sqlmodel import Session, create_engine, text
import setting

MIGRATION_ID = "0008_add_teacher_name_id_to_user"

DDL_SQL = """
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS teacher_name_id INTEGER
    REFERENCES teachernames(teacher_name_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_teacher_name_id
    ON "user" (teacher_name_id) WHERE teacher_name_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_user_teacher_name_id ON "user" (teacher_name_id);
"""


def add_teacher_name_id_column(session: Session) -> None:
    print('Adding "user".teacher_name_id (nullable, unique, FK -> teachernames)...')
    for stmt in DDL_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            session.exec(text(stmt))
    print("✓ user.teacher_name_id ready")
    print("  NOTE: all existing rows left NULL by design — no auto-matching.")
    print("  Link accounts manually via a direct SQL UPDATE or a future admin UI.")


def print_summary(session: Session) -> None:
    cols = session.exec(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'user' AND column_name = 'teacher_name_id'"
        )
    ).all()
    if cols:
        print("✓ user.teacher_name_id column present")
    else:
        print("⚠️  user.teacher_name_id column NOT found — investigate")

    linked = session.exec(
        text('SELECT COUNT(*) FROM "user" WHERE teacher_name_id IS NOT NULL')
    ).one()
    print(f"  Currently linked accounts: {linked[0] if isinstance(linked, tuple) else linked}")


def upgrade(session: Session) -> None:
    """Entry point for migrations/run_all_tenants.py. Does not commit."""
    add_teacher_name_id_column(session)


def main():
    parser = argparse.ArgumentParser(description="Add teacher_name_id FK to user table")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})
    with Session(engine) as session:
        add_teacher_name_id_column(session)
        session.commit()
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("USER <-> TEACHERNAMES IDENTITY LINK (Phase 2 follow-up)")
    print("=" * 60)
    print("\nThis script adds ONE nullable, unique column to \"user\":")
    print("  teacher_name_id -> teachernames.teacher_name_id")
    print("No existing data is modified. Press Ctrl+C to cancel, or Enter to continue...")
    input()
    main()