import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Map from "./components/Map";
import NoiseCheckInModal from "./components/NoiseCheckInModal";
import {
  getHeatmapData,
  submitReading,
  getNearbyReadings,
  getMyReadings,
} from "./api/noiseApi";

function rmsToStressScore(rms) {
  const MIN = 0.02;
  const MAX = 0.12;
  const x = (rms - MIN) / (MAX - MIN);
  return Math.max(0, Math.min(1, x));
}

function App() {
  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [center, setCenter] = useState(null);

  const [myReadings, setMyReadings] = useState([]);
  const [nearbyReadings, setNearbyReadings] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);

  // =========================
  // AUTH CHECK
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, []);

  // =========================
  // LOAD HEATMAP
  // =========================
  const refreshHeatmap = async () => {
    const data = await getHeatmapData();
    setHeatPoints(data);
  };

  // =========================
  // LOAD USER DATA
  // =========================
  const loadUserData = async (lat, lng) => {
    try {
      const myData = await getMyReadings();
      setMyReadings(myData);

      // 🔵 Recommended radius: 500 meters
      const nearbyData = await getNearbyReadings(lat, lng, 500);
      setNearbyReadings(nearbyData);
    } catch (err) {
      console.error("Failed loading readings:", err);
    }
  };

  // =========================
  // GET USER LOCATION
  // =========================
  useEffect(() => {
    if (!navigator.geolocation) {
      setCenter({ lat: 13.0827, lng: 80.2707 }); // Chennai fallback
      return;
    }

navigator.geolocation.getCurrentPosition(
  (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // 1️⃣ Set center immediately
    setCenter({ lat, lng });

    // 2️⃣ Load data AFTER (not awaited here)
    refreshHeatmap();
    loadUserData(lat, lng);
  },
      (err) => {
        console.warn("Location denied:", err);

        const fallback = { lat: 13.0827, lng: 80.2707 };
        setCenter(fallback);

        refreshHeatmap();
        loadUserData(fallback.lat, fallback.lng);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);

  // =========================
  // HANDLE NEW NOISE READING
  // =========================
  const handleNoiseDetected = (payload) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCenter({ lat, lng });

        try {
          const stress_score = rmsToStressScore(payload.rms);

          await submitReading({
            latitude: lat,
            longitude: lng,
            stress_score,
          });

          await refreshHeatmap();
          await loadUserData(lat, lng);

          setIsCheckInOpen(false);
        } catch (e) {
          console.error(e);
          alert("Failed to store in backend.");
        }
      },
      (err) => {
        console.error(err);
        alert("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // =========================
  // RENDER
  // =========================
  return (
    <>
      <Navbar />

      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
        }}
      >
        {center && (
          <Map
            lat={center.lat}
            lng={center.lng}
            points={myReadings.map(r => ({
              lat: r.latitude,
              lng: r.longitude,
              rms: r.stress_score,
              createdAt: r.id
            }))}
          />
        )}

        <button
          style={{
            borderRadius: "15px",
            backgroundColor: "black",
            margin: "20px",
            color: "white",
            padding: "10px 16px",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => setIsCheckInOpen(true)}
        >
          Check Noise Levels
        </button>

        {isCheckInOpen && (
          <NoiseCheckInModal
            onClose={() => setIsCheckInOpen(false)}
            onNoiseDetected={handleNoiseDetected}
          />
        )}
      </div>
    </>
  );
}

export default App;