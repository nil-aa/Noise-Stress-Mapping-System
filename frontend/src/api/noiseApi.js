import { refreshAccessToken } from "./authApi";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithAuth(url, options = {}, retry = true) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return fetchWithAuth(url, options, false);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return response;
}

export async function submitReading({
  latitude,
  longitude,
  stress_score,
  incident_type,
  notes,
  audio_duration_sec,
}) {
  const res = await fetchWithAuth(`${BASE_URL}/submit-reading`, {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
      stress_score,
      incident_type,
      notes,
      audio_duration_sec,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHeatmapData() {
  const res = await fetchWithAuth(`${BASE_URL}/heatmap-data`);

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMyReadings() {
  const res = await fetchWithAuth(`${BASE_URL}/my-readings`);

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function getNearbyReadings(lat, lng, radius = 500) {
  const res = await fetchWithAuth(
    `${BASE_URL}/nearby-readings?lat=${lat}&lng=${lng}&radius=${radius}`
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCommunityReadings(excludeUserIds = []) {
  const params = new URLSearchParams();
  if (excludeUserIds.length > 0) {
    params.set("exclude_user_ids", excludeUserIds.join(","));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetchWithAuth(`${BASE_URL}/community-readings${suffix}`);

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPredictedStress({ lat, lng, targetTime, radius = 1500 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    target_time: targetTime,
    radius: String(radius),
  });

  const res = await fetchWithAuth(`${BASE_URL}/predict-stress?${params.toString()}`);

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadReadingAudio({ readingId, audioBlob, filename = "recording.webm" }) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("audio", audioBlob, filename);

  const response = await fetch(`${BASE_URL}/readings/${readingId}/audio`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (response.status === 401) {
    try {
      await refreshAccessToken();
      return uploadReadingAudio({ readingId, audioBlob, filename });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      throw new Error("Session expired. Please sign in again.");
    }
  }

  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function generateLocalityReport({ lat, lng, localityName, radius = 1500, days = 30 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    locality_name: localityName,
    radius: String(radius),
    days: String(days),
  });

  const res = await fetchWithAuth(`${BASE_URL}/locality-report?${params.toString()}`);

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
