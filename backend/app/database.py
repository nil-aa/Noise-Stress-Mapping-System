from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./noise.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def init_db():
    """Create tables and apply minimal schema backfills for local SQLite DBs."""
    Base.metadata.create_all(bind=engine)

    if "sqlite" not in DATABASE_URL:
        return

    inspector = inspect(engine)
    if "noise_readings" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("noise_readings")}
    with engine.begin() as conn:
        # Backfill for pre-auth databases that were created without user ownership.
        if "user_id" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN user_id INTEGER"))
        # Store exact points for pin placement (separate from 1km grid aggregation).
        if "latitude" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN latitude FLOAT"))
        if "longitude" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN longitude FLOAT"))
