"""
token_deps.py — ROOT LEVEL, not under user/.

This module exists to break the circular import chain that appears when
JWT/auth dependencies are placed inside the user package.

Why it must stay at the root:
    user/__init__.py imports user_router, which imports db.py. That means
    anything under the user package (including user.settings) can trigger
    the package import chain before the dependency module finishes loading.
    This file must import nothing from the user package, directly or
    indirectly, so db.py can safely import it.
"""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from starlette.config import Config

# Independent .env read — deliberately not importing user.settings.
try:
    _config = Config(".env")
except FileNotFoundError:
    _config = Config()

SECRET_KEY = _config("SECRET_KEY", cast=str)
ALGORITHM = _config("ALGORITHM", cast=str)

# Separate from user.services.oauth2_scheme to avoid pulling in db.py.
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login-swagger", auto_error=False)


class TokenPayload(BaseModel):
    """The minimum payload required for tenant-scoped auth flows."""

    username: str
    tenant_id: str


async def get_token_from_cookie_or_header(
    request: Request,
    token_from_header: Annotated[Optional[str], Depends(_oauth2_scheme)] = None,
) -> str:
    """Prefer the Authorization header, then fall back to an access_token cookie."""
    if token_from_header:
        return token_from_header

    token_from_cookie = request.cookies.get("access_token")
    if token_from_cookie:
        return token_from_cookie

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - no token provided",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_token_payload(
    token: Annotated[str, Depends(get_token_from_cookie_or_header)],
) -> TokenPayload:
    """Decode a JWT and return the tenant-aware payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    tenant_id = payload.get("tenant_id")

    if not username or not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenPayload(username=username, tenant_id=tenant_id)
