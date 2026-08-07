"""
Migration script to seed role_permissions for the new `debit` module
(Debit Management: Manage Debit / View Debit / Comparison pages).

Idempotent -- safe to re-run. Skips any (role, module, action) row that
already exists.

Run standalone (one tenant):
    python 0004_add_debit_module_permissions.py
    python 0004_add_debit_module_permissions.py --database-url "postgresql://..."

Or fan out across all tenants via migrations/run_all_tenants.py, which
calls upgrade() below directly.
"""

import argparse

from sqlmodel import Session, select, create_engine
import setting

from schemas.role_permission_model import RolePermission
from user.user_models import UserRole

MIGRATION_ID = "0004_add_debit_module_permissions"

MODULE = "debit"
ACTIONS = ["view", "add", "edit", "delete"]

# Per-role defaults for the debit module.
# ADMIN: full access. ACCOUNTANT: everything except delete.
# All other roles: no access (module not relevant to their day-to-day work).
ROLE_DEFAULTS: dict[UserRole, dict[str, bool]] = {
    UserRole.ADMIN:           {"view": True,  "add": True,  "edit": True,  "delete": True},
    UserRole.CHIEF_PRINCIPAL: {"view": False, "add": False, "edit": False, "delete": False},
    UserRole.PRINCIPAL:       {"view": False, "add": False, "edit": False, "delete": False},
    UserRole.TEACHER:         {"view": False, "add": False, "edit": False, "delete": False},
    UserRole.STAFF:           {"view": False, "add": False, "edit": False, "delete": False},
    UserRole.ACCOUNTANT:      {"view": True,  "add": True,  "edit": True,  "delete": False},
    UserRole.FEE_MANAGER:     {"view": False, "add": False, "edit": False, "delete": False},
    UserRole.STUDENT:         {"view": False, "add": False, "edit": False, "delete": False},
}


def seed_permissions(session: Session, commit: bool = True) -> None:
    print(f"\nSeeding role_permissions for module '{MODULE}'...")
    inserted = 0
    skipped = 0
    for role, actions in ROLE_DEFAULTS.items():
        for action in ACTIONS:
            allowed = actions[action]
            existing = session.exec(
                select(RolePermission).where(
                    RolePermission.role == role,
                    RolePermission.module == MODULE,
                    RolePermission.action == action,
                )
            ).first()
            if existing:
                skipped += 1
                continue
            session.add(
                RolePermission(
                    role=role,
                    module=MODULE,
                    action=action,
                    allowed=allowed,
                )
            )
            inserted += 1
    if commit:
        session.commit()
    print(f"✓ Inserted {inserted} row(s), skipped {skipped} already-existing row(s)")


def print_summary(session: Session) -> None:
    rows = session.exec(
        select(RolePermission).where(RolePermission.module == MODULE)
    ).all()
    print(f"\n✓ {len(rows)} role_permissions rows now exist for module '{MODULE}':")
    for row in sorted(rows, key=lambda r: (r.role.value, r.action)):
        print(f"   {row.role.value:<16} {row.action:<8} allowed={row.allowed}")


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py.

    Does not commit. runner_core.py's apply_migration() commits the
    upgrade and the schema_migrations tracking row together, atomically.
    """
    seed_permissions(session, commit=False)


def main():
    parser = argparse.ArgumentParser(description="Seed role_permissions for the debit module")
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
        seed_permissions(session)
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("DEBIT MODULE — ROLE PERMISSIONS SEED")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Seed role_permissions rows for module 'debit' (view/add/edit/delete)")
    print("2. ADMIN gets full access, ACCOUNTANT gets view/add/edit, all other roles get none")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()
