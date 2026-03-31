import os
from sqlalchemy.orm import Session
from sqlmodel import SQLModel, create_engine
from typing import Generator
import setting

# Use test database URL from environment
TEST_DATABASE_URL: str = str(setting.TEST_DATABASE_URL)

# Create test engine
engine = create_engine(
    TEST_DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)

def init_test_db() -> None:
    """Initialize test database"""
    SQLModel.metadata.create_all(engine)

def override_get_session() -> Generator[Session, None, None]:
    """Override database session for testing."""
    from sqlmodel import Session
    with Session(engine) as session:
        yield session