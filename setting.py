from starlette.config import Config
from starlette.datastructures import Secret

try:
    config = Config(".env")

except FileNotFoundError:
    print("No .env file found, using default environment variables")
    config = Config()

DATABASE_URL = config.get("DATABASE_URL", cast=Secret)
TEST_DATABASE_URL = config.get("TEST_DATABASE_URL", cast=Secret)
CONTROL_PLANE_DATABASE_URL = config.get("CONTROL_PLANE_DATABASE_URL", cast=str, default=None)
CONTROL_PLANE_ENCRYPTION_KEY = config.get("CONTROL_PLANE_ENCRYPTION_KEY", cast=str, default=None)
SECRET_KEY = config("SECRET_KEY", cast=str)
ALGORITHM = config("ALGORITHM", cast=str)
ACCESS_TOKEN_EXPIRE_MINUTES = config("ACCESS_TOKEN_EXPIRE_MINUTES", cast=int)
REFRESH_TOKEN_EXPIRE_MINUTES = config("REFRESH_TOKEN_EXPIRE_MINUTES", cast=int)
JWT_REFRESH_SECRET_KEY = config("JWT_REFRESH_SECRET_KEY", cast=str)
