"""
Migration 0015 — Add user active-state and teacher soft-delete metadata.

Adds `is_active` to the `user` table and `deleted_at` / `deleted_by` to
`teachernames` for the teacher lifecycle and deleted staff archive flow.

Design:
- `user.is_active` defaults to TRUE so current active accounts continue to work
- `teachernames.deleted_at` tracks when a teacher was archived/soft-deleted
- `teachernames.deleted_by` tracks which admin triggered the soft-delete
- Non-destructive and safe to re-run

Run via the fan-out runner:
    uv run python -m migrations.run_all_tenants --dry-run --only 0015_add_user_active_and_teacher_delete_metadata
    uv run python -m migrations.run_all_tenants --only 0015_add_user_active_and_teacher_delete_metadata --tenant mzbs_staging_school
    uv run python -m migrations.run_all_tenants --only 0015_add_user_active_and_teacher_delete_metadata --tenant mzbs
"""

from sqlmodel import Session, text

MIGRATION_ID = "0015_add_user_active_and_teacher_delete_metadata"

DDL_SQL = """
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS ix_user_is_active ON "user" (is_active);

ALTER TABLE teachernames ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE teachernames ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL REFERENCES "user"(id);
CREATE INDEX IF NOT EXISTS ix_teachernames_deleted_at ON teachernames (deleted_at);
CREATE INDEX IF NOT EXISTS ix_teachernames_deleted_by ON teachernames (deleted_by);
"""


def upgrade(session: Session) -> None:
    """Add user active flag and teacher soft-delete metadata columns."""
    print('Adding "user".is_active and teachernames deleted metadata...')
    for stmt in DDL_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            session.exec(text(stmt))
    print("✓ user.is_active and teachernames deleted metadata ready")

