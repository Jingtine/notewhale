import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv(Path(__file__).resolve().parent / ".env")

DEFAULT_SQLITE_URL = "sqlite:///./notewhale.db"

SQLALCHEMY_DATABASE_URL = (os.getenv("DATABASE_URL") or DEFAULT_SQLITE_URL).strip()

# Some deployment platforms provide PostgreSQL URLs starting with "postgres://".
# SQLAlchemy expects "postgresql://".
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1,
    )

connect_args = {}

# SQLite needs this option for FastAPI local development.
# PostgreSQL does not support this argument.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
