"""
Corrects appearance_settings.theme_palette from the placeholder value
'default' (seeded by 0002, before the real defaultPaletteId was confirmed
against colorPalettes.ts) to 'slate-professional'.

Only touches rows still holding the placeholder -- if an ADMIN has already
changed their school's theme via the API since 0002 ran, this leaves that
choice untouched.
"""

from sqlmodel import Session, select
import setting
from sqlalchemy import create_engine

from schemas.appearance_model import AppearanceSettings

MIGRATION_ID = "0003_fix_appearance_default_palette"

CORRECT_DEFAULT = "slate-professional"
PLACEHOLDER = "default"


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py. Does not commit."""
    row = session.exec(select(AppearanceSettings).where(AppearanceSettings.id == 1)).first()
    if row and row.theme_palette == PLACEHOLDER:
        row.theme_palette = CORRECT_DEFAULT
        session.add(row)


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")
    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})

    with Session(engine) as session:
        row = session.exec(select(AppearanceSettings).where(AppearanceSettings.id == 1)).first()
        if not row:
            print("No appearance_settings row found — nothing to fix.")
            return
        if row.theme_palette != PLACEHOLDER:
            print(f"theme_palette is already {row.theme_palette!r} — nothing to fix.")
            return
        row.theme_palette = CORRECT_DEFAULT
        session.add(row)
        session.commit()
        print(f"✓ Fixed: theme_palette is now {CORRECT_DEFAULT!r}")


if __name__ == "__main__":
    main()
