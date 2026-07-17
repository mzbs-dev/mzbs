"""
Migration script to create the role_permissions and permission_change_log
tables, and seed role_permissions to match the CURRENT hardcoded behavior
of the app exactly (Phase 1, Day 1 of the multi-tenant plan).

This deliberately reproduces existing behavior, including one confirmed
mismatch that is being preserved as-is (see NOTE below) rather than
silently fixed, per the "zero behavior change on Day 1" rule.

Run this script once per environment:
    python add_role_permissions_tables.py
    python add_role_permissions_tables.py --database-url "postgresql://..."

If --database-url is omitted, it falls back to setting.DATABASE_URL
(i.e. whatever your local .env currently points to) — same convention
as add_effective_till_column.py.
"""

import argparse
from datetime import datetime

from sqlmodel import Session, select, create_engine, SQLModel
import setting

from schemas.role_permission_model import RolePermission, PermissionChangeLog
from user.user_models import UserRole


# ─── Seed matrix ────────────────────────────────────────────────────────────
# Reconstructed directly from:
#   - frontend/src/utils/rolePermissions.ts  (source of "view" for most modules)
#   - each router's actual require_*() dependency (source of add/edit/delete)
# Confirmed with the user, decision points resolved as follows:
#   - fees.add/edit includes FEE_MANAGER (matches live require_admin_accountant_fee_manager())
#   - fees.view additionally includes CHIEF_PRINCIPAL/PRINCIPAL (matches rolePermissions.ts,
#     even though those two roles currently 403 on the real GET endpoints — see NOTE below)
#   - salary.edit uses the broader ADMIN+ACCOUNTANT rule (some salary sub-resources are
#     currently ADMIN-only for edit — teacher-salary, ledger — this seed is intentionally
#     slightly more permissive for those two; tighten later if that turns out to matter)
#   - setup is split into 8 fine-grained modules, all ADMIN-only end-to-end (the Setup
#     *section* itself is ADMIN-only today; other roles reading the underlying reference
#     data — e.g. TEACHER reading class timings while marking attendance — do so through
#     their own module's permission, not through "setup", and are out of scope here)

ALL_ROLES = list(UserRole)
NON_STUDENT = [r for r in ALL_ROLES if r != UserRole.STUDENT]
ADMIN_ONLY = [UserRole.ADMIN]

MATRIX: dict[str, dict[str, list[UserRole]]] = {
    "students": {
        "view": NON_STUDENT,
        "add": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL],
        "edit": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL],
        "delete": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL],
    },
    "attendance": {
        "view": NON_STUDENT,
        "add": NON_STUDENT,
        "edit": NON_STUDENT,
        "delete": NON_STUDENT,
    },
    "exam": {
        "view": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER],
        "add": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER],
        "edit": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER],
        "delete": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL],  # NOTE: no TEACHER
    },
    "staff": {
        "view": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL],
        "add": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL],
        "edit": ADMIN_ONLY,   # NOTE: no CHIEF_PRINCIPAL, unlike view/add
        "delete": ADMIN_ONLY,
    },
    "fees": {
        # NOTE: CHIEF_PRINCIPAL/PRINCIPAL view=true here matches the frontend nav
        # (rolePermissions.ts), but the real GET endpoints currently require
        # require_admin_accountant_fee_manager(), which excludes them — a live
        # mismatch being preserved as-is per the user's explicit decision.
        "view": [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER,
                 UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL],
        "add": [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER],
        "edit": [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER],
        "delete": ADMIN_ONLY,
    },
    "income": {
        "view": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "add": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "edit": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "delete": ADMIN_ONLY,
    },
    "expenses": {
        "view": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "add": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "edit": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "delete": ADMIN_ONLY,
    },
    "salary": {
        "view": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "add": [UserRole.ADMIN, UserRole.ACCOUNTANT],
        "edit": [UserRole.ADMIN, UserRole.ACCOUNTANT],  # broader rule, see NOTE above
        "delete": ADMIN_ONLY,
    },
    # --- setup submodules: ADMIN-only end to end ---
    "setup_classes": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_class_subjects": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_timings": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_teachers": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_income_categories": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_expense_categories": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_users": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_reset_student_password": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
}

ACTIONS = ["view", "add", "edit", "delete"]


def build_rows() -> list[RolePermission]:
    """Expand MATRIX into one RolePermission row per (role, module, action)."""
    rows: list[RolePermission] = []
    for module, action_map in MATRIX.items():
        for action in ACTIONS:
            allowed_roles = set(action_map[action])
            for role in ALL_ROLES:
                rows.append(
                    RolePermission(
                        role=role,
                        module=module,
                        action=action,
                        allowed=role in allowed_roles,
                    )
                )
    return rows


def create_tables(bind) -> None:
    print("Creating role_permissions and permission_change_log tables (if not exist)...")
    SQLModel.metadata.create_all(
        bind,
        tables=[RolePermission.__table__, PermissionChangeLog.__table__],
    )
    print("✓ Tables ready")


def seed_permissions(session: Session, commit: bool = True) -> None:
    print("\nSeeding role_permissions to match current hardcoded behavior...")
    existing = session.exec(select(RolePermission)).all()
    existing_keys = {(r.role, r.module, r.action) for r in existing}

    rows_to_add = build_rows()
    added = 0
    skipped = 0

    for row in rows_to_add:
        key = (row.role, row.module, row.action)
        if key in existing_keys:
            skipped += 1
            continue
        session.add(row)
        added += 1

    if commit:
        session.commit()
    print(f"✓ Seed complete: {added} rows added, {skipped} already existed (skipped)")


def print_summary(session: Session) -> None:
    total = len(session.exec(select(RolePermission)).all())
    print(f"\nTotal role_permissions rows: {total}")
    expected = len(MATRIX) * len(ACTIONS) * len(ALL_ROLES)
    print(f"Expected rows ({len(MATRIX)} modules x {len(ACTIONS)} actions x {len(ALL_ROLES)} roles): {expected}")
    if total != expected:
        print("⚠️  Row count mismatch — investigate before proceeding to Day 2.")
    else:
        print("✓ Row count matches expected matrix size")


MIGRATION_ID = "0001_add_role_permissions_tables"


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py.

    This does not commit. runner_core.py's apply_migration() commits the
    upgrade and the schema_migrations tracking row together, atomically.
    """
    create_tables(session.connection())
    seed_permissions(session, commit=False)


def main():
    parser = argparse.ArgumentParser(description="Create + seed role_permissions tables")
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
        seed_permissions(session)
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("ROLE PERMISSIONS TABLE MIGRATION (Phase 1, Day 1)")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Create role_permissions + permission_change_log tables")
    print("2. Seed role_permissions to match current hardcoded require_*() behavior")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()
