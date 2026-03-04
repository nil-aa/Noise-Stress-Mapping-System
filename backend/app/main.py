from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from .database import SessionLocal, init_db
from .models import NoiseReading, User
from .schemas import ReadingCreate, ReadingResponse, UserCreate, Token
from .utils import convert_to_grid
from fastapi.middleware.cors import CORSMiddleware
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token
)
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from .auth import SECRET_KEY, ALGORITHM
import math

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = str(payload.get("sub"))
        token_type: str = str(payload.get("type"))

        if email is None or token_type != "access":
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(User).filter(User.email == email).first()

        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2) ** 2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@app.post("/submit-reading")
def submit_reading(
    reading: ReadingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    grid = convert_to_grid(reading.latitude, reading.longitude)

    new_reading = NoiseReading(
        grid_location=grid,
        latitude=reading.latitude,
        longitude=reading.longitude,
        stress_score=reading.stress_score,
        user_id=current_user.id
    )

    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)

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

@app.post("/auth/register")
def signup(user: UserCreate):
    db: Session = SessionLocal()

    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
        hashed_password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {"message": "User created successfully"}


@app.post("/auth/login", response_model=Token)
def login(user: UserCreate):
    db: Session = SessionLocal()

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": db_user.email})
    refresh_token = create_refresh_token(data={"sub": db_user.email})

    db.close()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@app.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")

        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        new_access_token = create_access_token(data={"sub": email})
        new_refresh_token = create_refresh_token(data={"sub": email})

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.get("/my-readings")
def get_my_readings(current_user: User = Depends(get_current_user)):
    db: Session = SessionLocal()

    readings = (
        db.query(NoiseReading)
        .filter(NoiseReading.user_id == current_user.id)
        .all()
    )

    result = []

    for r in readings:
        if r.latitude is not None and r.longitude is not None:
            lat, lng = float(r.latitude), float(r.longitude)
        else:
            lat, lng = map(float, r.grid_location.split(","))
        result.append({
            "id": r.id,
            "latitude": lat,
            "longitude": lng,
            "stress_score": r.stress_score,
            "timestamp": r.timestamp,
            "user_id": r.user_id
        })

    db.close()
    return result

@app.get("/nearby-readings")
def get_nearby_readings(
    lat: float,
    lng: float,
    radius: float = 500,
    current_user: User = Depends(get_current_user)
):
    db: Session = SessionLocal()
    readings = db.query(NoiseReading).all()
    db.close()

    result = []

    for r in readings:
        if r.latitude is not None and r.longitude is not None:
            r_lat, r_lng = float(r.latitude), float(r.longitude)
        else:
            r_lat, r_lng = map(float, r.grid_location.split(","))

        distance = haversine(lat, lng, r_lat, r_lng)

        if distance <= radius:
            result.append({
                "id": r.id,
                "latitude": r_lat,
                "longitude": r_lng,
                "user_id": r.user_id,
                "stress_score": r.stress_score,
                "timestamp": r.timestamp
            })

    return result
    

