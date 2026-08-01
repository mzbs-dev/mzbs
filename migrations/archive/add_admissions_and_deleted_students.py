"""
One-off corrective migration: adds the admissions and deleted_students
modules, discovered while wiring adm_del.py / deleted_students.py into
require_permission() (Day 3).

  - admissions: ADMIN-only end-to-end (no capability change from current
    require_admin() behavior — just wired into the dynamic system)
  - deleted_students: view/edit = ADMIN, CHIEF_PRINCIPAL, PRINCIPAL
    (edit = restore_student); delete = ADMIN only (permanent delete)
    — matches current require_admin_principal()/require_admin() exactly

Run once per environment, AFTER Day 1's migration has already run there:
    python add_admissions_and_deleted_students.py --database-url "postgresql://..."
    python add_admissions_and_deleted_students.py   (defaults to setting.DATABASE_URL)
"""

import argparse
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, select, create_engine
import setting

from schemas.role_permission_model import RolePermission
from user.user_models import UserRole

ALL_ROLES = list(UserRole)
ADMIN_ONLY = [UserRole.ADMIN]
PRINCIPAL_TIER = [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL]
ACTIONS = ["view", "add", "edit", "delete"]

MATRIX = {
    "admissions": {
        "view": ADMIN_ONLY,   # unused today (no GET endpoint), seeded for consistency
        "add": ADMIN_ONLY,    # add_admission
        "edit": ADMIN_ONLY,   # unused today
        "delete": ADMIN_ONLY, # delete_attendance (admission) + terminate_student
    },
    "deleted_students": {
        "view": PRINCIPAL_TIER,    # get_deleted_students
        "add": ADMIN_ONLY,         # unused today
        "edit": PRINCIPAL_TIER,    # restore_student
        "delete": ADMIN_ONLY,      # permanently_delete_student
    },
}


def add_module_rows(session: Session, module: str, action_map: dict) -> None:
    existing = session.exec(
        select(RolePermission).where(RolePermission.module == module)
    ).all()
    existing_keys = {(r.role, r.action) for r in existing}

    added = 0
    for action in ACTIONS:
        allowed_set = set(action_map[action])
        for role in ALL_ROLES:
            if (role, action) in existing_keys:
                continue
            session.add(RolePermission(
                role=role,
                module=module,
                action=action,
                allowed=role in allowed_set,
            ))
            added += 1

    session.commit()
    print(f"  [add]  {added} {module} rows created")


def main():
    parser = argparse.ArgumentParser(description="Add admissions + deleted_students modules")
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
    print("FIX: add admissions + deleted_students modules")
    print("=" * 60)
    main()
