"""
Migration script to create the appearance_settings table (Merge & Cutover
follow-up work, post Phase 5).

Single-row table (id=1, enforced via CHECK constraint) living inside each
tenant's own database. Seeded once with the default palette; ADMIN then
PATCHes it in place via the API. No history table -- last write wins.

Run this script standalone (one tenant):
    python 0002_add_appearance_settings.py
    python 0002_add_appearance_settings.py --database-url "postgresql://..."

If --database-url is omitted, falls back to setting.DATABASE_URL, same
convention as add_effective_till_column.py and 0001.

Or fan out across all tenants via migrations/run_all_tenants.py, which
calls upgrade() below directly.
"""

import argparse

from sqlmodel import Session, select, create_engine, SQLModel
import setting

from schemas.appearance_model import AppearanceSettings

# Matches frontend's defaultPaletteId in frontend/src/config/colorPalettes.ts
DEFAULT_PALETTE_ID = "slate-professional"

MIGRATION_ID = "0002_add_appearance_settings"


def create_tables(bind) -> None:
    print("Creating appearance_settings table (if not exists)...")
    SQLModel.metadata.create_all(bind, tables=[AppearanceSettings.__table__])
    print("✓ Table ready")


def seed_default_row(session: Session, commit: bool = True) -> None:
    print("\nSeeding appearance_settings with default palette...")
    existing = session.exec(select(AppearanceSettings).where(AppearanceSettings.id == 1)).first()
    if existing:
        print(f"✓ Row already exists (theme_palette={existing.theme_palette!r}), skipping")
        return
    session.add(AppearanceSettings(id=1, theme_palette=DEFAULT_PALETTE_ID))
    if commit:
        session.commit()
    print(f"✓ Seeded id=1, theme_palette={DEFAULT_PALETTE_ID!r}")


def print_summary(session: Session) -> None:
    row = session.exec(select(AppearanceSettings).where(AppearanceSettings.id == 1)).first()
    if row:
        print(f"\n✓ appearance_settings row confirmed: theme_palette={row.theme_palette!r}")
    else:
        print("\n⚠️  No appearance_settings row found — investigate before proceeding.")


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py.

    Does not commit. runner_core.py's apply_migration() commits the
    upgrade and the schema_migrations tracking row together, atomically.
    """
    create_tables(session.connection())
    seed_default_row(session, commit=False)


def main():
    parser = argparse.ArgumentParser(description="Create + seed appearance_settings table")
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
        seed_default_row(session)
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("APPEARANCE SETTINGS TABLE MIGRATION")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Create appearance_settings table")
    print("2. Seed it with the default palette (single row, id=1)")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()
