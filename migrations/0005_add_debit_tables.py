"""
Migration script to create the debit and debit_payment tables (Debit
Management module — Manage Debit / View Debit / Comparison pages).

Two tables:
  - debit: one row per borrowing record ("Add Debit").
  - debit_payment: one row per repayment/clearance transaction
    ("Clear Debit"), FK'd to debit.id.

Remaining balance and status are computed at READ time from
debit.amount minus SUM(debit_payment.cleared_amount) — not stored — so
this migration only needs to create structure, no recalculation logic
and no backfill.

Run this script standalone (one tenant):
    python 0005_add_debit_tables.py
    python 0005_add_debit_tables.py --database-url "postgresql://..."

If --database-url is omitted, falls back to setting.DATABASE_URL, same
convention as 0002_add_appearance_settings.py.

Or fan out across all tenants via migrations/run_all_tenants.py, which
calls upgrade() below directly.
"""

import argparse

from sqlalchemy import inspect
from sqlmodel import Session, create_engine, SQLModel
import setting

from schemas.debit_model import Debit, DebitPayment

MIGRATION_ID = "0005_add_debit_tables"


def create_tables(bind) -> None:
    print("Creating 'debit' table (if not exists)...")
    print("Creating 'debit_payment' table (if not exists)...")
    # Passing both tables together lets SQLAlchemy resolve FK creation
    # order automatically (debit before debit_payment).
    SQLModel.metadata.create_all(bind, tables=[Debit.__table__, DebitPayment.__table__])
    print("✓ Tables ready")


def print_summary(session: Session) -> None:
    inspector = inspect(session.connection())
    tables = inspector.get_table_names()
    for t in ("debit", "debit_payment"):
        status = "✓ present" if t in tables else "⚠️  MISSING — investigate before proceeding"
        print(f"   {t}: {status}")


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py.

    No DML to commit here — CREATE TABLE IF NOT EXISTS is DDL, applied
    directly against the connection. Kept as a function (rather than
    inlined) for symmetry with other migration files and so
    runner_core.py's apply_migration() can still record the
    schema_migrations tracking row afterward.
    """
    create_tables(session.connection())


def main():
    parser = argparse.ArgumentParser(description="Create debit + debit_payment tables")
    parser.add_argument(
        "--database-url",
        default=None,
        help="Target DB connection string. Defaults to setting.DATABASE_URL (local .env) if omitted.",
    )
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})

    create_tables(engine)

    with Session(engine) as session:
        print("\nVerifying tables:")
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("DEBIT MODULE — TABLE CREATION")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Create the 'debit' table (borrowing records)")
    print("2. Create the 'debit_payment' table (clearance/repayment records, FK -> debit)")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()
