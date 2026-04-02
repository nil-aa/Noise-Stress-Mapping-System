from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./noise.db")
print("DATABASE_URL =", DATABASE_URL)

if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"sslmode": "require"}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def init_db():
    """Create tables and apply lightweight schema backfills."""
    Base.metadata.create_all(bind=engine)

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
        if "incident_type" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN incident_type VARCHAR"))
        if "notes" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN notes VARCHAR"))
        if "audio_path" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN audio_path VARCHAR"))
        if "audio_mime_type" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN audio_mime_type VARCHAR"))
        if "audio_duration_sec" not in columns:
            conn.execute(text("ALTER TABLE noise_readings ADD COLUMN audio_duration_sec FLOAT"))
