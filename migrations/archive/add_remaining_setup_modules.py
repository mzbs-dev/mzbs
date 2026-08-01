"""
One-off corrective migration: adds the remaining setup_* modules discovered
while wiring class_subjects.py, teacher_names.py, income_cat_names.py,
expense_cat_names.py, and admin_create_user.py into require_permission()
(Day 3).

  - setup_class_subjects: ADMIN-only end-to-end
  - setup_teachers: ADMIN-only end-to-end
  - setup_users: ADMIN-only end-to-end
  - setup_income_categories / setup_expense_categories: SPECIAL CASE —
    view = ADMIN, ACCOUNTANT, FEE_MANAGER (matches current behavior, since
    ACCOUNTANT/FEE_MANAGER need the category dropdown for their own
    income/expense entry forms); add/edit/delete = ADMIN only (tightened
    per explicit decision — ACCOUNTANT/FEE_MANAGER currently CAN write
    categories today, and this migration deliberately removes that)

Run once per environment, AFTER Day 1's migration has already run there:
    python add_remaining_setup_modules.py --database-url "postgresql://..."
    python add_remaining_setup_modules.py   (defaults to setting.DATABASE_URL)
"""

import argparse
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, select, create_engine
import setting

from schemas.role_permission_model import RolePermission
from user.user_models import UserRole

ALL_ROLES = list(UserRole)
ADMIN_ONLY = [UserRole.ADMIN]
ADMIN_ACCOUNTANT_FEE_MANAGER = [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER]
ACTIONS = ["view", "add", "edit", "delete"]

MATRIX = {
    "setup_class_subjects": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_teachers": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_users": {"view": ADMIN_ONLY, "add": ADMIN_ONLY, "edit": ADMIN_ONLY, "delete": ADMIN_ONLY},
    "setup_income_categories": {
        "view": ADMIN_ACCOUNTANT_FEE_MANAGER,  # matches current behavior — unchanged
        "add": ADMIN_ONLY,                     # tightened — ACCOUNTANT/FEE_MANAGER lose write access
        "edit": ADMIN_ONLY,
        "delete": ADMIN_ONLY,
    },
    "setup_expense_categories": {
        "view": ADMIN_ACCOUNTANT_FEE_MANAGER,  # matches current behavior — unchanged
        "add": ADMIN_ONLY,                     # tightened — ACCOUNTANT/FEE_MANAGER lose write access
        "edit": ADMIN_ONLY,
        "delete": ADMIN_ONLY,
    },
}


def add_module_rows(session: Session, module: str, action_map: dict) -> None:
    existing = session.exec(
        select(RolePermission).where(RolePermission.module == module)
    ).all()
    existing_by_key = {(r.role, r.action): r for r in existing}

    added = 0
    updated = 0
    for action in ACTIONS:
        allowed_set = set(action_map[action])
        for role in ALL_ROLES:
            target_allowed = role in allowed_set
            existing_row = existing_by_key.get((role, action))
            if existing_row is None:
                session.add(RolePermission(
                    role=role,
                    module=module,
                    action=action,
                    allowed=target_allowed,
                ))
                added += 1
            elif existing_row.allowed != target_allowed:
                existing_row.allowed = target_allowed
                session.add(existing_row)
                updated += 1

    session.commit()
    if added or updated:
        print(f"  [sync] {module}: {added} added, {updated} updated")
    else:
        print(f"  [skip] {module}: {len(existing)} rows already present and up to date")


def main():
    parser = argparse.ArgumentParser(description="Add remaining setup_* modules")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    try:
        engine = create_engine(conn_string, connect_args={"connect_timeout": 10})

        with Session(engine) as session:
            for module, action_map in MATRIX.items():
                add_module_rows(session, module, action_map)
    except OperationalError as exc:
        print("\n❌ Database connection failed.")
        print("This is usually caused by an unreachable host, DNS resolution, or network access issue.")
        print(f"Details: {exc}")
        raise SystemExit(1) from exc

    print("\n✅ Fix completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("FIX: add remaining setup_* modules")
    print("=" * 60)
    print("\nThis will tighten setup_income_categories/setup_expense_categories")
    print("add/edit/delete to ADMIN-only, removing ACCOUNTANT/FEE_MANAGER's")
    print("current write access to those categories. view stays unchanged.")
    main()
