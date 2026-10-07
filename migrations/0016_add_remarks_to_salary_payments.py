"""Add optional remarks to salary payment records."""

from sqlmodel import Session, text

MIGRATION_ID = "0016_add_remarks_to_salary_payments"


def upgrade(session: Session) -> None:
    """Add a nullable remarks column to salary_payment."""
    session.exec(text("ALTER TABLE salary_payment ADD COLUMN IF NOT EXISTS remarks VARCHAR(500)"))
