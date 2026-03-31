import os
import re

# Map your role-checker functions to actual roles
ROLE_CHECK_MAP = {
    "require_admin": ["ADMIN"],
    "require_authenticated": ["ADMIN", "TEACHER", "USER", "ACCOUNTANT", "FEE_MANAGER", "PRINCIPAL"],
    "require_admin_principal": ["ADMIN", "PRINCIPAL"],
    "require_admin_teacher_principal": ["ADMIN", "TEACHER", "PRINCIPAL"],
    "require_admin_accountant": ["ADMIN", "ACCOUNTANT"],
    "require_admin_fee_manager": ["ADMIN", "FEE_MANAGER"],
    "require_all_roles": ["ADMIN", "TEACHER", "USER", "ACCOUNTANT", "FEE_MANAGER", "PRINCIPAL"],
}

def FileExplorer(base_paths):
    # Match endpoints e.g. @router.post("/...")
    endpoint_pattern = re.compile(r'@(\w+_router)\.(get|post|put|delete|patch)\(["\'](.*?)["\']')
    # Match any role-checker function usage
    role_checker_pattern = re.compile(r'(require_\w+)\s*\(')

    for base_path in base_paths:
        for root, dirs, files in os.walk(base_path):
            for file in files:
                if file.endswith(".py"):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()

                    matches = endpoint_pattern.finditer(content)

                    endpoints = []
                    for match in matches:
                        router_name, method, endpoint = match.groups()

                        # Look around this section of code for role-checker references
                        snippet = content[match.start(): match.end() + 500]
                        role_checkers = role_checker_pattern.findall(snippet)

                        roles = []
                        for checker in role_checkers:
                            roles.extend(ROLE_CHECK_MAP.get(checker, []))

                        if not roles:
                            roles = ["PUBLIC"]

                        endpoints.append((method.upper(), endpoint, roles))

                    if endpoints:
                        print(f"\n📂 File: {file}")
                        for method, endpoint, roles in endpoints:
                            role_str = ", ".join(sorted(set(roles)))
                            print(f"   ➜ {method} {endpoint}   [Roles: {role_str}]")

# Run for router + user folders
FileExplorer([
    r"G:/GitHub/mms_general/router",
    r"G:/GitHub/mms_general/user"
])
