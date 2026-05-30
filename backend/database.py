import os
import shutil
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DEFAULT_SQLITE_DB_PATH = Path(__file__).resolve().parent.parent / "properties.db"

# Handle writable SQLite database in /tmp when deployed to serverless environments (Vercel)
if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    writable_db_path = Path("/tmp/properties.db")
    if not writable_db_path.exists():
        if DEFAULT_SQLITE_DB_PATH.exists():
            shutil.copy(DEFAULT_SQLITE_DB_PATH, writable_db_path)
    DEFAULT_SQLITE_URL = f"sqlite:///{writable_db_path}"
else:
    DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_DB_PATH}"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

# Robust mapping for standard legacy PostgreSQL URLs
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
