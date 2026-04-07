import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { getMyReadings } from "../api/noiseApi";
import "./Evidence.css";

function Evidence() {
  const [myReadings, setMyReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMyReadings()
      .then((data) => {
        if (isMounted) {
          setMyReadings(data);
        }
      })
      .catch((requestError) => {
        console.error(requestError);
        if (isMounted) {
          setError("Unable to load your stored evidence right now.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const evidenceReadings = useMemo(
    () => myReadings.filter((reading) => reading.audio_url || reading.notes || reading.incident_type),
    [myReadings]
  );

  return (
    <div className="evidence-page">
      <Navbar />

      <main className="evidence-main">
        <section className="evidence-hero">
          <span className="section-label">Evidence Vault</span>
          <h1>Review saved audio, notes, and field evidence.</h1>
          <p>
            Access the supporting material linked to your readings without cluttering the main
            dashboard. Use it to review incidents, verify context, and prepare reporting records.
          </p>
        </section>

        {loading && <div className="evidence-card"><p>Loading saved evidence...</p></div>}
        {error && !loading && <div className="evidence-card"><p>{error}</p></div>}

        {!loading && !error && (
          <section className="evidence-grid">
            {evidenceReadings.length > 0 ? (
              evidenceReadings.map((reading) => (
                <article className="evidence-card" key={reading.id}>
                  <div className="evidence-card-head">
                    <div>
                      <span className="section-label">{reading.incident_type || "Recorded incident"}</span>
                      <h2>{new Date(reading.timestamp).toLocaleString()}</h2>
                    </div>
                    <strong>{(Number(reading.stress_score || 0) * 100).toFixed(1)}%</strong>
                  </div>

                  <div className="evidence-meta">
                    <p>Latitude: {Number(reading.latitude).toFixed(5)}</p>
                    <p>Longitude: {Number(reading.longitude).toFixed(5)}</p>
                    {reading.audio_duration_sec && <p>Duration: {reading.audio_duration_sec.toFixed(2)}s</p>}
                  </div>

                  {reading.notes && <p className="evidence-notes">{reading.notes}</p>}

                  {reading.audio_url ? (
                    <audio controls preload="none" src={reading.audio_url} />
                  ) : (
                    <p className="evidence-muted">No audio file attached to this record.</p>
                  )}
                </article>
              ))
            ) : (
              <div className="evidence-card">
                <p>No saved evidence yet. Add notes or audio to a reading to build your record.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default Evidence;
