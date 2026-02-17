from fastapi import FastAPI
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import NoiseReading
from .schemas import ReadingCreate, ReadingResponse
from .utils import convert_to_grid

app = FastAPI()

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/submit-reading")
def submit_reading(reading: ReadingCreate):
    db: Session = SessionLocal()

    grid = convert_to_grid(reading.latitude, reading.longitude)

    new_reading = NoiseReading(
        grid_location=grid,
        stress_score=reading.stress_score,
    )

    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    db.close()

    return {"message": "Reading stored successfully"}


@app.get("/readings")
def get_readings():
    db: Session = SessionLocal()
    readings = db.query(NoiseReading).all()
    db.close()
    return readings


@app.get("/heatmap-data")
def get_heatmap_data():
    db: Session = SessionLocal()
    readings = db.query(NoiseReading).all()
    db.close()

    grid_data = {}

    for reading in readings:
        if reading.grid_location not in grid_data:
            grid_data[reading.grid_location] = []

        grid_data[reading.grid_location].append(reading.stress_score)

    result = []

    for grid, scores in grid_data.items():
        lat, lon = map(float, grid.split(","))
        avg_stress = sum(scores) / len(scores) if scores else 0

        result.append({
            "latitude": lat,
            "longitude": lon,
            "average_stress": avg_stress,
            "count": len(scores)
        })

    return result
