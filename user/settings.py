from starlette.config import Config


try:
    config = Config(".env")
except FileNotFoundError:
    config = Config()

DATABASE_URL = config("DATABASE_URL", cast=str)
SECRET_KEY = config("SECRET_KEY", cast=str)
ALGORITHM = config("ALGORITHM", cast=str)
ACCESS_TOKEN_EXPIRE_MINUTES = config("ACCESS_TOKEN_EXPIRE_MINUTES", cast=int)
REFRESH_TOKEN_EXPIRE_MINUTES = config("REFRESH_TOKEN_EXPIRE_MINUTES", cast=int)
JWT_REFRESH_SECRET_KEY = config("JWT_REFRESH_SECRET_KEY", cast=str)

# Phase 3 — fallback tenant when a login request doesn't specify tenant_id
# (old frontends not yet redeployed with NEXT_PUBLIC_TENANT_ID, Swagger UI
# testing, etc.). Set this to the existing live school's tenant_id.
DEFAULT_TENANT_ID = config("DEFAULT_TENANT_ID", cast=str, default="")
