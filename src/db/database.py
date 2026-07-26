import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

_PARENTS_TO_REPO_ROOT = 2  # 0=src/db; 1=src; 2=root (target)
REPO_ROOT = Path(__file__).resolve().parents[_PARENTS_TO_REPO_ROOT]

DEFAULT_DATABASE_PATH = REPO_ROOT / "data" / "letterboxd.db"
DATABASE_PATH = os.environ.get("DATABASE_PATH", str(DEFAULT_DATABASE_PATH))
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Make sure the parent directory exists to prevent SQL error
# Attemps to create one if doesn't exist
Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from src.db.models import Base

    Base.metadata.create_all(bind=engine)
