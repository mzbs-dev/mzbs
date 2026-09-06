"""Add optional remarks to fee records."""

import argparse

from sqlmodel import Session, create_engine, text
import setting

MIGRATION_ID = "0012_add_remarks_to_fees"


def add_remarks_column(session: Session) -> None:
    session.exec(text("ALTER TABLE fee ADD COLUMN IF NOT EXISTS remarks TEXT"))


def upgrade(session: Session) -> None:
    """Entry point for migrations/run_all_tenants.py. Does not commit."""
    add_remarks_column(session)


def main():
    parser = argparse.ArgumentParser(description="Add remarks to fee records")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})
    with Session(engine) as session:
        add_remarks_column(session)
        session.commit()
    print("Migration completed successfully")


if __name__ == "__main__":
    main()