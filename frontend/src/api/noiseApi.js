const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function submitReading({ latitude, longitude, stress_score }) {
  const res = await fetch(`${BASE_URL}/submit-reading`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ latitude, longitude, stress_score }),
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHeatmapData() {
  const res = await fetch(`${BASE_URL}/heatmap-data`, {
    headers: getAuthHeaders(),
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMyReadings() {
  const res = await fetch(`${BASE_URL}/my-readings`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function getNearbyReadings(lat, lng, radius = 500) {
  const res = await fetch(
    `${BASE_URL}/nearby-readings?lat=${lat}&lng=${lng}&radius=${radius}`,
    { headers: getAuthHeaders() }
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}