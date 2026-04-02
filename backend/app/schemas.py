from pydantic import BaseModel
from datetime import datetime


class ReadingCreate(BaseModel):
    latitude: float
    longitude: float
    stress_score: float
    incident_type: str | None = None
    notes: str | None = None
    audio_duration_sec: float | None = None


class ReadingResponse(BaseModel):
    id: int
    grid_location: str
    stress_score: float
    timestamp: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
