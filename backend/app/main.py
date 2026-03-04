from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
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

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = str(payload.get("sub"))
        token_type: str = str(payload.get("type"))

        if email is None or token_type != "access":
            raise HTTPException(status_code=401, detail="Invalid token")

        return email

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.post("/submit-reading")
def submit_reading(reading: ReadingCreate, current_user: str = Depends(get_current_user)):
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
    

