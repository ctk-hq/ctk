import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker


def _default_database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    db_remote = os.getenv("DB_REMOTE", "false").lower() == "true"
    if db_remote:
        db_host = os.getenv("DB_HOST", "localhost")
        db_name = os.getenv("DB_NAME", "postgres")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASS", "postgres")
        return f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:5432/{db_name}"

    return "postgresql+psycopg2://postgres:postgres@postgres:5432/postgres"


DATABASE_URL = _default_database_url()

engine_kwargs = {"pool_pre_ping": True}
engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
