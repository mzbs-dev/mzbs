"""
Migration 0011 — Add soft delete support to TeacherNames.

Adds `is_deleted` column to `teachernames` table to support soft deletion.
When a teacher is deleted, the record is marked as deleted instead of being
physically removed from the database. This preserves all related records
(attendance, salary, exam marks, etc.) and maintains data integrity.

Design:
- `is_deleted` BOOLEAN column, default FALSE
- When deleted, is_deleted is set to TRUE
- All related records (attendance, salary, etc.) remain intact
- GET endpoints filter out soft-deleted teachers
- Soft-deleted teachers are hidden from all lists but data is preserved
- Non-destructive — old related records stay linked and accessible

Additive only. No destructive changes. Safe to re-run.

Run via the fan-out runner:
    uv run python -m migrations.run_all_tenants --dry-run --only 0011_add_soft_delete_to_teachernames
    uv run python -m migrations.run_all_tenants --only 0011_add_soft_delete_to_teachernames --tenant mzbs_staging_school
    uv run python -m migrations.run_all_tenants --only 0011_add_soft_delete_to_teachernames --tenant mzbs
"""

from sqlmodel import Session, text

MIGRATION_ID = "0011_add_soft_delete_to_teachernames"

DDL_SQL = """
ALTER TABLE teachernames ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS ix_teachernames_is_deleted ON teachernames (is_deleted);
"""


def upgrade(session: Session) -> None:
    """Add is_deleted column to teachernames table."""
    print('Adding "teachernames".is_deleted column for soft delete support...')
    for stmt in DDL_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            session.exec(text(stmt))
    print("✓ teachernames.is_deleted ready")
    print("  Teachers can now be soft-deleted without losing related records.")
