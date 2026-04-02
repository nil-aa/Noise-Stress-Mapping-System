from __future__ import annotations

import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.auth import hash_password  # noqa: E402
from app.database import SessionLocal, init_db  # noqa: E402
from app.models import NoiseReading, User  # noqa: E402
from app.utils import convert_to_grid  # noqa: E402


LOCALITIES = [
    ("Anna Nagar", 13.0849, 80.2101, 0.54),
    ("Adyar", 13.0067, 80.2574, 0.49),
    ("T Nagar", 13.0418, 80.2337, 0.63),
    ("Velachery", 12.9791, 80.2209, 0.58),
    ("Tambaram", 12.9249, 80.1000, 0.60),
    ("Chromepet", 12.9516, 80.1462, 0.59),
    ("Pallavaram", 12.9675, 80.1508, 0.56),
    ("Porur", 13.0352, 80.1588, 0.57),
    ("Mogappair", 13.0837, 80.1791, 0.51),
    ("Ambattur", 13.1143, 80.1548, 0.55),
    ("Avadi", 13.1067, 80.1018, 0.50),
    ("Perambur", 13.1180, 80.2337, 0.61),
    ("Ayanavaram", 13.0987, 80.2324, 0.58),
    ("Kilpauk", 13.0823, 80.2410, 0.56),
    ("Egmore", 13.0732, 80.2609, 0.62),
    ("Nungambakkam", 13.0604, 80.2420, 0.57),
    ("Kodambakkam", 13.0524, 80.2257, 0.60),
    ("Vadapalani", 13.0500, 80.2121, 0.61),
    ("Ashok Nagar", 13.0352, 80.2120, 0.55),
    ("Guindy", 13.0108, 80.2122, 0.59),
    ("Saidapet", 13.0223, 80.2237, 0.57),
    ("Mylapore", 13.0336, 80.2697, 0.48),
    ("Triplicane", 13.0588, 80.2756, 0.60),
    ("Royapettah", 13.0551, 80.2632, 0.59),
    ("Besant Nagar", 13.0003, 80.2668, 0.43),
    ("Thiruvanmiyur", 12.9830, 80.2594, 0.47),
    ("Perungudi", 12.9607, 80.2406, 0.55),
    ("Sholinganallur", 12.9010, 80.2279, 0.52),
    ("Navalur", 12.8449, 80.2265, 0.49),
    ("Siruseri", 12.8230, 80.2293, 0.46),
    ("Palavakkam", 12.9535, 80.2562, 0.44),
    ("Medavakkam", 12.9229, 80.1922, 0.53),
    ("Pallikaranai", 12.9353, 80.2140, 0.56),
    ("Selaiyur", 12.9187, 80.1361, 0.51),
    ("Vandalur", 12.8913, 80.0810, 0.50),
    ("Poonamallee", 13.0473, 80.0945, 0.52),
    ("Thiruvottiyur", 13.1643, 80.3009, 0.57),
    ("Ennore", 13.2143, 80.3203, 0.54),
    ("Manali", 13.1665, 80.2582, 0.58),
    ("Red Hills", 13.1865, 80.1999, 0.50),
    ("Kolathur", 13.1246, 80.2187, 0.56),
    ("Villivakkam", 13.1081, 80.2076, 0.55),
    ("George Town", 13.0942, 80.2931, 0.67),
    ("Parrys Corner", 13.0905, 80.2876, 0.65),
    ("Madhavaram", 13.1487, 80.2306, 0.54),
    ("Koyambedu", 13.0732, 80.1943, 0.66),
    ("Marina Beach", 13.0500, 80.2824, 0.46),
    ("Chengalpattu", 12.6819, 79.9836, 0.42),
]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def compute_stress(base_level: float, dt: datetime) -> float:
    hour = dt.hour + (dt.minute / 60)

    morning_peak = math.exp(-((hour - 9) / 2.4) ** 2) * 0.12
    evening_peak = math.exp(-((hour - 18.5) / 2.7) ** 2) * 0.14
    late_night_drop = math.exp(-((hour - 2) / 2.6) ** 2) * -0.10
    weekend_adjustment = -0.04 if dt.weekday() >= 5 else 0.0
    seasonal_wave = math.sin(dt.timetuple().tm_yday / 18) * 0.03
    random_jitter = random.uniform(-0.06, 0.06)

    return clamp(
        base_level + morning_peak + evening_peak + late_night_drop + weekend_adjustment + seasonal_wave + random_jitter,
        0.08,
        0.97,
    )


def main() -> None:
    random.seed(42)
    init_db()
    session = SessionLocal()

    try:
      seed_user = session.query(User).filter(User.email == "demo.seed@noise.local").first()
      if seed_user is None:
          seed_user = User(
              email="demo.seed@noise.local",
              hashed_password=hash_password("demo1234"),
          )
          session.add(seed_user)
          session.commit()
          session.refresh(seed_user)

      existing_seeded = (
          session.query(NoiseReading)
          .filter(NoiseReading.user_id == seed_user.id)
          .count()
      )

      if existing_seeded > 0:
          print(f"Seed data already present: {existing_seeded} seeded readings found.")
          return

      now = datetime.now(timezone.utc).replace(tzinfo=None)
      generated = []

      for name, lat, lng, base_level in LOCALITIES:
          locality_volume = random.randint(28, 44)
          for _ in range(locality_volume):
              days_ago = random.randint(0, 180)
              minutes_offset = random.randint(0, 23 * 60 + 59)
              timestamp = now - timedelta(days=days_ago, minutes=minutes_offset)

              jitter_lat = lat + random.uniform(-0.0038, 0.0038)
              jitter_lng = lng + random.uniform(-0.0038, 0.0038)
              stress_score = compute_stress(base_level, timestamp)

              generated.append(
                  NoiseReading(
                      grid_location=convert_to_grid(jitter_lat, jitter_lng),
                      latitude=jitter_lat,
                      longitude=jitter_lng,
                      stress_score=stress_score,
                      timestamp=timestamp,
                      user_id=seed_user.id,
                  )
              )

      session.add_all(generated)
      session.commit()
      print(f"Inserted {len(generated)} synthetic readings across {len(LOCALITIES)} Chennai localities.")
    finally:
      session.close()


if __name__ == "__main__":
    main()
