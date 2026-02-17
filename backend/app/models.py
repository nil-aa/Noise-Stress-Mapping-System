from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
from .database import Base

class NoiseReading(Base):
    __tablename__ = "noise_readings"

    id = Column(Integer, primary_key=True, index=True)
    grid_location = Column(String)
    stress_score = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
