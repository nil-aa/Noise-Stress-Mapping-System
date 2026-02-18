const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function submitReading({ latitude, longitude, stress_score }) {
  const res = await fetch(`${BASE_URL}/submit-reading`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude, stress_score }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHeatmapData() {
  const res = await fetch(`${BASE_URL}/heatmap-data`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
