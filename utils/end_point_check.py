# import os
# import re

# def FileExplorer(base_path):
#     # Match any router decorator with forward slash routes, e.g. @students_router.get("/...")
#     endpoint_pattern = re.compile(r'@(\w+_router)\.(get|post|put|delete|patch)\(["\'](/.*?)["\']')

#     for root, dirs, files in os.walk(base_path):
#         for file in files:
#             if file.endswith(".py"):
#                 file_path = os.path.join(root, file)
#                 with open(file_path, "r", encoding="utf-8") as f:
#                     content = f.read()

#                 matches = endpoint_pattern.findall(content)

#                 if matches:
#                     print(f"\n📂 File: {file}")
#                     for router_name, method, endpoint in matches:
#                         print(f"   ➜ {method.upper()} {endpoint}   (via {router_name})")

# # Run the explorer
# FileExplorer(r"G:/GitHub/mms_general/user")
# FileExplorer(r"G:/GitHub/mms_general/router")



from typing import Annotated, List
from fastapi import Depends, HTTPException, status
from user.user_models import UserRole

def require_roles(allowed_roles: List[UserRole]):
    """
    Simple role checker - allows access if user has any of the specified roles
    Admin always has access to everything
    """
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]):
        # Admin has access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Check if user has one of the allowed roles
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        
        return current_user
    
    return role_checker

# Pre-defined role checkers for your specific use cases
def require_admin():
    return require_roles([UserRole.ADMIN])

def require_admin_principal():
    return require_roles([UserRole.ADMIN, UserRole.PRINCIPAL])

def require_admin_teacher_principal():
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL])

def require_admin_accountant():
    return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT])

def require_admin_fee_manager():
    return require_roles([UserRole.ADMIN, UserRole.FEE_MANAGER])

def require_all_roles():
    return require_roles([UserRole.ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT, 
                         UserRole.FEE_MANAGER, UserRole.PRINCIPAL, UserRole.USER])

def require_authenticated():
    """Any authenticated user can access"""
    def checker(current_user: Annotated[User, Depends(get_current_user)]):
        return current_user
    return checker
