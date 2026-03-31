from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel, create_engine, Session
from utils.logging import logger
import setting

CONN_STRING: str = str(setting.DATABASE_URL)

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
    
    engine = create_engine(
        CONN_STRING,
        echo=True,
        connect_args=connect_args,
        pool_size=10,  # Number of connections to keep in pool
        max_overflow=20,  # Additional connections beyond pool_size
        pool_recycle=300,  # Recycle connections after 5 minutes to avoid stale connections
        pool_pre_ping=True  # Test connections before using to ensure they're still valid
    )
    logger.info("Engine created successfully")
    return engine

engine = get_engine(CONN_STRING=CONN_STRING)

# Add SessionLocal
SessionLocal = Session

def create_db_and_tables():
    # SQLModel.metadata.drop_all(engine)  # Drop existing tables
    SQLModel.metadata.create_all(engine)

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

def get_session():
    session = None
    try:
        session = SessionLocal(engine)
        yield session
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        if session:
            session.close()
