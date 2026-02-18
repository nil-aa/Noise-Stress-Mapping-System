import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Map from "./components/Map";
import NoiseCheckInModal from "./components/NoiseCheckInModal";
import { getHeatmapData, submitReading } from "./api/noiseApi";

function rmsToStressScore(rms) {
  const MIN = 0.02;
  const MAX = 0.12;
  const x = (rms - MIN) / (MAX - MIN);
  return Math.max(0, Math.min(1, x));
}

function App() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Your existing “exact markers”
  const [points, setPoints] = useState([]); // [{lat, lng, rms, peak, createdAt}]

  // Backend aggregated grid points
  const [heatPoints, setHeatPoints] = useState([]); // [{latitude, longitude, average_stress, count}]

  const [center, setCenter] = useState({ lat: 13.0827, lng: 80.2707 });

  const addPoint = (p) => setPoints((prev) => [p, ...prev]);

  const refreshHeatmap = async () => {
    const data = await getHeatmapData();
    setHeatPoints(data);
  };

  useEffect(() => {
    refreshHeatmap().catch(console.error);
  }, []);

  const handleNoiseDetected = (payload) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCenter({ lat, lng });

        // show marker immediately
        addPoint({
          lat,
          lng,
          rms: payload.rms,
          peak: payload.peak,
          createdAt: Date.now(),
        });

        // persist to DB via backend
        try {
          const stress_score = rmsToStressScore(payload.rms);
          await submitReading({ latitude: lat, longitude: lng, stress_score });

          // refresh aggregated map points from DB
          await refreshHeatmap();

          setIsCheckInOpen(false);
        } catch (e) {
          console.error(e);
          alert("Saved locally on map, but failed to store in backend DB.");
        }
      },
      (err) => {
        console.error(err);
        alert("Location permission denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
        <Map lat={center.lat} lng={center.lng} points={points} heatPoints={heatPoints} />

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
