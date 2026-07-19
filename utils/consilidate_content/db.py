import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from threading import Lock
from types import SimpleNamespace
from typing import Annotated, Dict
from urllib.parse import urlparse, urlunparse

from fastapi import Depends, FastAPI
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, create_engine, Session, select, text
from utils.logging import logger
import setting

import schemas.student_parent_credentials_model  # noqa: F401

from control_plane_client.tenant_lookup import lookup_tenant_connection
from token_deps import TokenPayload, get_token_payload

CONN_STRING: str = str(setting.DATABASE_URL)


def _normalize_database_url(raw_url: str) -> str:
    """Use a SQLAlchemy-compatible dialect based on the available DB driver."""
    if not raw_url or raw_url == "None":
        return raw_url

    if raw_url.startswith("postgresql+"):
        return raw_url

    parsed = urlparse(raw_url)
    if parsed.scheme in {"postgresql", "postgres"}:
        try:
            import psycopg2  # noqa: F401
            return urlunparse(parsed._replace(scheme="postgresql+psycopg2"))
        except Exception:
            try:
                import psycopg  # noqa: F401
                return urlunparse(parsed._replace(scheme="postgresql+psycopg"))
            except Exception:
                return raw_url

    return raw_url

# Validate DATABASE_URL is configured
if not CONN_STRING or CONN_STRING == "None":
    logger.error("DATABASE_URL is not configured! Please set DATABASE_URL environment variable.")
    logger.error("Example: postgresql://user:password@localhost/dbname")
    raise ValueError("DATABASE_URL environment variable is required but not set")

def get_engine(CONN_STRING):
    # Configure connection pooling for PostgreSQL
    # Note: Neon pooler doesn't support statement_timeout in options
    connect_args = {
        "connect_timeout": 10,  # Connection timeout in seconds
    }

    normalized_url = _normalize_database_url(CONN_STRING)
    engine = create_engine(
        normalized_url,
        echo=True,
        connect_args=connect_args,
        pool_size=10,  # Number of connections to keep in pool
        max_overflow=20,  # Additional connections beyond pool_size
        pool_recycle=300,  # Recycle connections after 5 minutes to avoid stale connections
        pool_pre_ping=True  # Test connections before using to ensure they're still valid
    )
    logger.info("Engine created successfully using %s", normalized_url)
    return engine

engine = get_engine(CONN_STRING=CONN_STRING)


def get_control_plane_engine():
    """Create an engine for the separate control-plane database used by tenant lookup."""
    control_plane_url = (
        os.getenv("CONTROL_PLANE_DATABASE_URL")
        or getattr(setting, "CONTROL_PLANE_DATABASE_URL", None)
    )
    if not control_plane_url or control_plane_url == "None":
        raise RuntimeError("CONTROL_PLANE_DATABASE_URL is required for migration runner control-plane access")

    normalized_url = _normalize_database_url(control_plane_url)
    logger.info("Control-plane engine created using %s", normalized_url)
    return create_engine(
        normalized_url,
        connect_args={"connect_timeout": 10},
        pool_size=5,
        max_overflow=5,
        pool_recycle=300,
        pool_pre_ping=True,
    )


def get_control_plane_session() -> Session:
    """Return a SQLModel session bound to the control-plane database."""
    return Session(get_control_plane_engine())


def list_tenants(session: Session) -> list[SimpleNamespace]:
    """Return tenant records from the control-plane database in the shape the runner expects."""
    rows = session.exec(text("SELECT tenant_id, status FROM tenants")).all()
    return [SimpleNamespace(tenant_id=row[0], status=row[1]) for row in rows]


# Add SessionLocal
SessionLocal = Session

_tenant_engines: Dict[str, Engine] = {}
_tenant_engine_last_used: Dict[str, datetime] = {}
_tenant_engine_lock = Lock()
_TENANT_ENGINE_TTL = timedelta(minutes=30)


def evict_idle_tenant_engines(max_idle_minutes: int = 30) -> list[str]:
    """Remove cached tenant engines that have been unused for longer than the threshold."""
    cutoff = datetime.utcnow() - timedelta(minutes=max_idle_minutes)
    with _tenant_engine_lock:
        stale_tenant_ids = [
            tenant_id
            for tenant_id, last_used in _tenant_engine_last_used.items()
            if last_used < cutoff
        ]
        for tenant_id in stale_tenant_ids:
            tenant_engine = _tenant_engines.pop(tenant_id, None)
            _tenant_engine_last_used.pop(tenant_id, None)
            if tenant_engine is not None:
                tenant_engine.dispose()
    return stale_tenant_ids


def get_tenant_engine(tenant_id: str) -> Engine:
    """Resolve a tenant_id to a cached engine."""
    evict_idle_tenant_engines(max_idle_minutes=int(_TENANT_ENGINE_TTL.total_seconds() // 60))
    with _tenant_engine_lock:
        tenant_engine = _tenant_engines.get(tenant_id)
        if tenant_engine is None:
            conn_str = lookup_tenant_connection(tenant_id)
            tenant_engine = get_engine(conn_str)
            _tenant_engines[tenant_id] = tenant_engine
            logger.info(f"Created new engine for tenant '{tenant_id}'")
        _tenant_engine_last_used[tenant_id] = datetime.utcnow()
        return tenant_engine


def seed_attendance_values():
    """Seed initial attendance values into the database"""
    try:
        session = SessionLocal(engine)
        from schemas.attendance_value_model import AttendanceValue
        
        # Check if values already exist
        existing_values = session.exec(select(AttendanceValue)).all()
        if existing_values:
            logger.info(f"Attendance values already exist: {len(existing_values)} values found")
            session.close()
            return
        
        # Define the 4 core attendance values
        attendance_values = [
            AttendanceValue(attendance_value="Present"),
            AttendanceValue(attendance_value="Absent"),
            AttendanceValue(attendance_value="Late"),
            AttendanceValue(attendance_value="Leave"),
        ]
        
        for value in attendance_values:
            session.add(value)
        
        session.commit()
        logger.info("Attendance values seeded successfully: Present, Absent, Late, Leave")
        session.close()
    except Exception as e:
        logger.error(f"Error seeding attendance values: {str(e)}")
        session.close()
        raise

def create_db_and_tables():
    # SQLModel.metadata.drop_all(engine)  # Drop existing tables
    SQLModel.metadata.create_all(engine)
    seed_attendance_values()  # Seed initial data

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Creating database connection")
    try:
        create_db_and_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        raise
    yield
    logger.info("Closing database connection")

def get_session(payload: Annotated[TokenPayload, Depends(get_token_payload)]):
    session = None
    try:
        tenant_engine = get_tenant_engine(payload.tenant_id)
        session = SessionLocal(tenant_engine)
        yield session
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        if session:
            session.close()
