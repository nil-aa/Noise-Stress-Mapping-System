import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Map from "./components/Map";
import NoiseCheckInModal from "./components/NoiseCheckInModal";

function App() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [points, setPoints] = useState([]); // [{lat, lng, rms, peak, createdAt}]
  const [center, setCenter] = useState({ lat: 13.0827, lng: 80.2707 }); // optional

  const addPoint = (p) => setPoints((prev) => [p, ...prev]);

  const handleNoiseDetected = (payload) => {
    // Ask for location ONLY if noise is detected
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // optionally recenter map
        setCenter({ lat, lng });

        addPoint({
          lat,
          lng,
          rms: payload.rms,
          peak: payload.peak,
          createdAt: Date.now(),
        });

        setIsCheckInOpen(false);
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
        <Map lat={center.lat} lng={center.lng} points={points} />

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
