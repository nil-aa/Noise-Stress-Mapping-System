from pydantic import BaseModel
from datetime import datetime


class ReadingCreate(BaseModel):
    latitude: float
    longitude: float
    stress_score: float


class ReadingResponse(BaseModel):
    id: int
    grid_location: str
    stress_score: float
    timestamp: datetime

    class Config:
        from_attributes = True
