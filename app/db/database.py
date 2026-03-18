from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

_sqlite = "sqlite" in SQLALCHEMY_DATABASE_URL.lower()
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if _sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_problem_links_target_category():
    """Add target_category_id to problem_links if missing (existing DBs before this column)."""
    insp = inspect(engine)
    if "problem_links" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("problem_links")}
    if "target_category_id" in cols:
        return
    stmt = text(
        "ALTER TABLE problem_links ADD COLUMN target_category_id INTEGER NOT NULL DEFAULT 2"
    )
    with engine.begin() as conn:
        conn.execute(stmt)
