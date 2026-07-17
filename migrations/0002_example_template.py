"""
migrations/0001_example_template.py

Copy this file to create a new migration. Rename it as the NEXT sequential
number (e.g. 0002_add_admissions_module.py) — the numeric prefix determines
run order via filename sort, and doubles as a human-readable changelog.

Rules (see migrations/RUNBOOK.md):
- Never delete or renumber an already-applied migration file. New schools
  onboarding later need the full historical sequence to reach current schema.
- Every statement should be idempotent where possible (IF NOT EXISTS, etc.)
  so a migration that partially applied and is re-run doesn't error out.
- Keep MIGRATION_ID identical to the filename stem (without .py) — this is
  what gets written into schema_migrations, and what --only matches against.
"""

from sqlmodel import Session, text

MIGRATION_ID = "0001_example_template"


def upgrade(session: Session) -> None:
    session.exec(
        text(
            """
            CREATE TABLE IF NOT EXISTS example_table (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    # NOTE: no session.commit() here — apply_migration() in runner_core.py
    # commits the upgrade + the schema_migrations insert together as one
    # transaction, so a mid-upgrade failure never leaves a false "applied" row.
