from datetime import datetime, timedelta, timezone
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, Depends, Request, UploadFile
from sqlalchemy.orm import Session
from typing import Optional
from .database import SessionLocal, init_db
from .models import NoiseReading, User
from .schemas import ReadingCreate, ReadingResponse, UserCreate, Token
from .utils import convert_to_grid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads"
AUDIO_UPLOAD_DIR = UPLOAD_ROOT / "audio"
AUDIO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

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


def normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def circular_hour_distance(left: float, right: float) -> float:
    diff = abs(left - right)
    return min(diff, 24 - diff)


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def weighted_average(items: list[tuple[float, float]]) -> Optional[float]:
    if not items:
        return None

    total_weight = sum(weight for _, weight in items)
    if total_weight <= 0:
        return None

    weighted_sum = sum(value * weight for value, weight in items)
    return weighted_sum / total_weight


def estimate_stress_for_time(
    readings: list[NoiseReading],
    latitude: float,
    longitude: float,
    target_time: datetime,
    radius: float
):
    target_time = normalize_timestamp(target_time)
    now = datetime.utcnow()
    target_hour = target_time.hour + (target_time.minute / 60)

    nearby_samples = []
    exact_window_samples = []
    recent_samples = []
    baseline_samples = []

    for reading in readings:
        if reading.latitude is not None and reading.longitude is not None:
            reading_lat = float(reading.latitude)
            reading_lng = float(reading.longitude)
        else:
            reading_lat, reading_lng = map(float, reading.grid_location.split(","))

        distance = haversine(latitude, longitude, reading_lat, reading_lng)
        if distance > radius:
            continue

        reading_time = normalize_timestamp(reading.timestamp)
        reading_hour = reading_time.hour + (reading_time.minute / 60)
        hour_distance = circular_hour_distance(target_hour, reading_hour)

        distance_weight = math.exp(-(distance / max(radius, 1)))
        hour_weight = max(0.15, 1 - (hour_distance / 12))
        weekday_weight = 1.15 if reading_time.weekday() == target_time.weekday() else 0.9
        recency_days = abs((now - reading_time).total_seconds()) / 86400
        recency_weight = math.exp(-(recency_days / 75))
        combined_weight = distance_weight * hour_weight * weekday_weight * recency_weight

        nearby_samples.append((reading.stress_score, combined_weight, distance, reading_time))

        time_gap_hours = abs((target_time - reading_time).total_seconds()) / 3600
        if time_gap_hours <= 2:
            exact_window_samples.append((reading.stress_score, max(combined_weight * 1.6, 0.25)))

        if reading_time >= now - timedelta(days=14):
            recent_samples.append(reading.stress_score)
        elif reading_time >= now - timedelta(days=90):
            baseline_samples.append(reading.stress_score)

    if not nearby_samples:
        return None

    localized_average = weighted_average([(value, weight) for value, weight, _, _ in nearby_samples])
    exact_average = weighted_average(exact_window_samples)
    recent_average = sum(recent_samples) / len(recent_samples) if recent_samples else localized_average
    baseline_average = sum(baseline_samples) / len(baseline_samples) if baseline_samples else localized_average
    trend = recent_average - baseline_average

    hour_bucket_samples = [
        sample.stress_score
        for sample in readings
        if sample.timestamp is not None
        and circular_hour_distance(
            target_hour,
            normalize_timestamp(sample.timestamp).hour + (normalize_timestamp(sample.timestamp).minute / 60)
        ) <= 1.5
    ]
    hour_bias = (
        (sum(hour_bucket_samples) / len(hour_bucket_samples)) - localized_average
        if hour_bucket_samples
        else 0
    )

    is_future = target_time > now
    future_days = max(0, (target_time - now).total_seconds() / 86400)

    prediction = exact_average if exact_average is not None else localized_average
    prediction += hour_bias * 0.35

    if is_future:
        prediction += trend * min(1.0, future_days / 21) * 0.5
        mode = "forecast"
        mode_label = "Predictive Forecast"
    else:
        lookback_days = max(0, (now - target_time).total_seconds() / 86400)
        prediction += trend * min(0.25, lookback_days / 365) * 0.15
        mode = "historical"
        mode_label = "Historical Estimate"

    average_distance = sum(distance for _, _, distance, _ in nearby_samples) / len(nearby_samples)
    confidence = clamp(
        (1 - min(average_distance / max(radius, 1), 1)) * (1 - math.exp(-(len(nearby_samples) / 6))),
        0.12,
        0.96,
    )

    return {
        "predicted_stress_score": round(clamp(prediction, 0, 1), 4),
        "confidence": round(confidence, 4),
        "samples_used": len(nearby_samples),
        "matching_samples": len(exact_window_samples),
        "mode": mode,
        "mode_label": mode_label,
        "trend": round(trend, 4),
    }


def build_audio_url(request: Request, audio_path: Optional[str]) -> Optional[str]:
    if not audio_path:
        return None
    return str(request.base_url).rstrip("/") + audio_path


def serialize_reading(reading: NoiseReading, request: Request):
    if reading.latitude is not None and reading.longitude is not None:
        lat, lng = float(reading.latitude), float(reading.longitude)
    else:
        lat, lng = map(float, reading.grid_location.split(","))

    return {
        "id": reading.id,
        "latitude": lat,
        "longitude": lng,
        "stress_score": reading.stress_score,
        "timestamp": reading.timestamp,
        "user_id": reading.user_id,
        "incident_type": reading.incident_type,
        "notes": reading.notes,
        "audio_url": build_audio_url(request, reading.audio_path),
        "audio_duration_sec": reading.audio_duration_sec,
    }


def build_locality_report(
    readings: list[NoiseReading],
    latitude: float,
    longitude: float,
    locality_name: str,
    radius: float,
    days: int,
    request: Request,
):
    now = datetime.utcnow()
    window_start = now - timedelta(days=days)
    nearby = []

    for reading in readings:
        if reading.latitude is not None and reading.longitude is not None:
            reading_lat = float(reading.latitude)
            reading_lng = float(reading.longitude)
        else:
            reading_lat, reading_lng = map(float, reading.grid_location.split(","))

        distance = haversine(latitude, longitude, reading_lat, reading_lng)
        if distance <= radius and reading.timestamp >= window_start:
            nearby.append((reading, distance))

    if not nearby:
        return None

    scoped_readings = [reading for reading, _ in nearby]
    average_stress = sum(float(reading.stress_score) for reading in scoped_readings) / len(scoped_readings)
    max_stress = max(float(reading.stress_score) for reading in scoped_readings)
    high_stress_count = sum(1 for reading in scoped_readings if float(reading.stress_score) >= 0.65)
    nighttime_count = sum(
        1
        for reading in scoped_readings
        if normalize_timestamp(reading.timestamp).hour >= 22 or normalize_timestamp(reading.timestamp).hour < 6
    )
    audio_evidence_count = sum(1 for reading in scoped_readings if reading.audio_path)

    top_incidents = sorted(
        nearby,
        key=lambda item: (float(item[0].stress_score), item[0].timestamp),
        reverse=True,
    )[:8]

    incident_breakdown = {}
    for reading in scoped_readings:
        key = reading.incident_type or "Unspecified disturbance"
        incident_breakdown[key] = incident_breakdown.get(key, 0) + 1

    strongest_category = max(incident_breakdown.items(), key=lambda item: item[1])[0]
    predicted = estimate_stress_for_time(scoped_readings, latitude, longitude, now, radius)

    summary_lines = [
        f"Noise stress observations were reviewed for {locality_name} within approximately {int(radius)} meters over the last {days} days.",
        f"The average observed stress score was {average_stress:.2f}, with a peak observed score of {max_stress:.2f}.",
        f"{high_stress_count} readings crossed the elevated-stress threshold, and {nighttime_count} incidents were recorded during late-night hours.",
        f"The most frequently reported disturbance category was {strongest_category.lower()}.",
    ]

    if predicted is not None:
        summary_lines.append(
            f"The current locality estimate indicates a stress score of {predicted['predicted_stress_score']:.2f} with {round(predicted['confidence'] * 100)}% confidence."
        )

    recommendation_lines = [
        "Review repeated night-time disturbances and compare them with local construction, event, or loudspeaker restrictions.",
        "Use the attached audio evidence and timestamps to support a written complaint to municipal, police, or pollution-control authorities.",
        "Request targeted inspection during the hours where repeated elevated readings appear in this report.",
    ]

    return {
        "locality_name": locality_name,
        "latitude": latitude,
        "longitude": longitude,
        "radius": radius,
        "days_reviewed": days,
        "generated_at": now.isoformat(),
        "average_stress_score": round(average_stress, 4),
        "peak_stress_score": round(max_stress, 4),
        "high_stress_count": high_stress_count,
        "nighttime_incident_count": nighttime_count,
        "audio_evidence_count": audio_evidence_count,
        "incident_breakdown": incident_breakdown,
        "summary": " ".join(summary_lines),
        "recommendations": recommendation_lines,
        "predicted_current_stress": predicted,
        "evidence_items": [
            {
                **serialize_reading(reading, request),
                "distance_meters": round(distance, 1),
            }
            for reading, distance in top_incidents
        ],
    }


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
        incident_type=reading.incident_type,
        notes=reading.notes,
        audio_duration_sec=reading.audio_duration_sec,
        user_id=current_user.id
    )

    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)

    return {"message": "Reading stored successfully", "reading_id": new_reading.id}


@app.get("/readings")
def get_readings():
    db: Session = SessionLocal()
    readings = db.query(NoiseReading).all()
    db.close()
    return readings


@app.get("/heatmap-data")
def get_heatmap_data(db: Session = Depends(get_db)):
    readings = db.query(NoiseReading).all()
    grouped = {}

    for reading in readings:
        if reading.latitude is not None and reading.longitude is not None:
            lat = float(reading.latitude)
            lon = float(reading.longitude)
            grid_key = convert_to_grid(lat, lon)
        else:
            lat, lon = map(float, reading.grid_location.split(","))
            grid_key = reading.grid_location

        bucket = grouped.setdefault(
            grid_key,
            {"latitude": lat, "longitude": lon, "total_stress": 0.0, "count": 0},
        )
        bucket["total_stress"] += float(reading.stress_score)
        bucket["count"] += 1

    return [
        {
            "latitude": bucket["latitude"],
            "longitude": bucket["longitude"],
            "average_stress": round(bucket["total_stress"] / bucket["count"], 4),
            "count": bucket["count"],
        }
        for bucket in grouped.values()
    ]

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
def get_my_readings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    readings = (
        db.query(NoiseReading)
        .filter(NoiseReading.user_id == current_user.id)
        .order_by(NoiseReading.timestamp.desc())
        .all()
    )
    return [serialize_reading(reading, request) for reading in readings]

@app.get("/nearby-readings")
def get_nearby_readings(
    request: Request,
    lat: float,
    lng: float,
    radius: float = 500,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    readings = db.query(NoiseReading).all()

    result = []

    for r in readings:
        if r.latitude is not None and r.longitude is not None:
            r_lat, r_lng = float(r.latitude), float(r.longitude)
        else:
            r_lat, r_lng = map(float, r.grid_location.split(","))

        distance = haversine(lat, lng, r_lat, r_lng)

        if distance <= radius:
            payload = serialize_reading(r, request)
            payload["distance_meters"] = round(distance, 1)
            result.append(payload)

    return result


@app.get("/predict-stress")
def predict_stress(
    lat: float,
    lng: float,
    target_time: datetime,
    radius: float = 1500,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    readings = db.query(NoiseReading).all()
    prediction = estimate_stress_for_time(readings, lat, lng, target_time, radius)

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Not enough nearby readings to estimate stress for this locality yet.",
        )

    return {
        "latitude": lat,
        "longitude": lng,
        "target_time": normalize_timestamp(target_time).isoformat(),
        "radius": radius,
        **prediction,
    }


@app.post("/readings/{reading_id}/audio")
async def upload_reading_audio(
    reading_id: int,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reading = (
        db.query(NoiseReading)
        .filter(NoiseReading.id == reading_id, NoiseReading.user_id == current_user.id)
        .first()
    )

    if reading is None:
        raise HTTPException(status_code=404, detail="Reading not found")

    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio uploads are supported.")

    extension = Path(audio.filename or "recording.webm").suffix or ".webm"
    safe_name = f"reading_{reading_id}_{int(datetime.utcnow().timestamp())}{extension}"
    destination = AUDIO_UPLOAD_DIR / safe_name
    data = await audio.read()
    destination.write_bytes(data)

    reading.audio_path = f"/uploads/audio/{safe_name}"
    reading.audio_mime_type = audio.content_type
    db.commit()
    db.refresh(reading)

    return {
        "message": "Audio uploaded successfully",
        "audio_url": reading.audio_path,
        "mime_type": reading.audio_mime_type,
    }


@app.get("/locality-report")
def generate_locality_report(
    request: Request,
    lat: float,
    lng: float,
    locality_name: str,
    radius: float = 1500,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    readings = db.query(NoiseReading).all()
    report = build_locality_report(readings, lat, lng, locality_name, radius, days, request)

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Not enough recent readings were found to prepare a locality report.",
        )

    return report

