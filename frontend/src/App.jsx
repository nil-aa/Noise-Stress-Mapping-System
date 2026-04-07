import React, { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import Map from "./components/Map";
import NoiseCheckInModal from "./components/NoiseCheckInModal";
import { Link } from "react-router-dom";
import {
  getHeatmapData,
  getCommunityReadings,
  getMyReadings,
  getPredictedStress,
  generateLocalityReport,
  submitReading,
  uploadReadingAudio,
} from "./api/noiseApi";
import { chennaiLocalities } from "./data/chennaiLocalities";
import "./App.css";

function rmsToStressScore(rms) {
  const min = 0.02;
  const max = 0.12;
  const normalized = (rms - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}

function formatCoordinate(value) {
  return typeof value === "number" ? value.toFixed(4) : "--";
}

function getDefaultDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function App() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [center, setCenter] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Finding your live monitoring zone...");

  const [myReadings, setMyReadings] = useState([]);
  const [communityReadings, setCommunityReadings] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);
  const [selectedLocality, setSelectedLocality] = useState(chennaiLocalities[0].name);
  const [targetDateTime, setTargetDateTime] = useState(getDefaultDateTimeValue);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const refreshHeatmap = async () => {
    const data = await getHeatmapData();
    setHeatPoints(data);
  };

  const loadUserData = async () => {
    const [myData, communityData] = await Promise.all([
      getMyReadings(),
      getCommunityReadings([3]),
    ]);

    setMyReadings(myData);
    setCommunityReadings(communityData);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      const fallback = { lat: 13.0827, lng: 80.2707 };
      setCenter(fallback);
      setStatusMessage("Using Chennai as the fallback monitoring region.");
      setIsLoadingLocation(false);
      refreshHeatmap();
      loadUserData().catch((error) => {
        console.error("Failed loading readings:", error);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCenter({ lat, lng });
        setStatusMessage("Live environmental stress view synced to your current location.");
        setIsLoadingLocation(false);

        refreshHeatmap();
        loadUserData().catch((error) => {
          console.error("Failed loading readings:", error);
        });
      },
      (error) => {
        console.warn("Location denied:", error);

        const fallback = { lat: 13.0827, lng: 80.2707 };
        setCenter(fallback);
        setStatusMessage("Location access was unavailable, so the dashboard is centered on Chennai.");
        setIsLoadingLocation(false);

        refreshHeatmap();
        loadUserData().catch((requestError) => {
          console.error("Failed loading fallback readings:", requestError);
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);

  const combinedPoints = useMemo(
    () => {
      const basePoints = [
        ...myReadings.map((reading) => ({
          lat: reading.latitude,
          lng: reading.longitude,
          rms: reading.stress_score,
          createdAt: reading.id,
          type: "mine",
          incidentType: reading.incident_type,
          notes: reading.notes,
          audioUrl: reading.audio_url,
        })),
        ...communityReadings
          .filter((reading) => !myReadings.some((mine) => mine.id === reading.id))
          .map((reading) => ({
            lat: reading.latitude,
            lng: reading.longitude,
            rms: reading.stress_score,
            createdAt: reading.id,
            type: "other",
            incidentType: reading.incident_type,
            notes: reading.notes,
            audioUrl: reading.audio_url,
          })),
      ];

      if (!predictionResult) {
        return basePoints;
      }

      return [
        ...basePoints,
        {
          lat: predictionResult.latitude,
          lng: predictionResult.longitude,
          rms: predictionResult.predicted_stress_score,
          createdAt: `prediction-${predictionResult.target_time}`,
          type: "prediction",
          label: predictionResult.locality_name,
          predictionMeta: predictionResult,
        },
      ];
    },
    [myReadings, communityReadings, predictionResult]
  );

  const stats = useMemo(() => {
    const highestStress = myReadings.reduce((max, reading) => {
      return Math.max(max, Number(reading.stress_score || 0));
    }, 0);

    const averageStress =
      myReadings.length > 0
        ? myReadings.reduce((sum, reading) => sum + Number(reading.stress_score || 0), 0) /
        myReadings.length
        : 0;

    return {
      myReports: myReadings.length,
      nearbyReports: communityReadings.length,
      heatZones: heatPoints.length,
      highestStress,
      averageStress,
    };
  }, [communityReadings.length, heatPoints.length, myReadings]);

  const handleNoiseDetected = (payload) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCenter({ lat, lng });
        setStatusMessage("New reading captured and dashboard refreshed.");

        try {
          const stressScore = rmsToStressScore(payload.rms);

          const readingResponse = await submitReading({
            latitude: lat,
            longitude: lng,
            stress_score: stressScore,
            incident_type: payload.incidentType,
            notes: payload.notes,
            audio_duration_sec: payload.durationSec,
          });

          if (payload.audioBlob && readingResponse?.reading_id) {
            try {
              await uploadReadingAudio({
                readingId: readingResponse.reading_id,
                audioBlob: payload.audioBlob,
                filename: payload.audioFilename || "recording.webm",
              });
            } catch (audioError) {
              console.error("Reading saved but audio upload failed:", audioError);
              setStatusMessage("Reading saved, but the audio proof could not be uploaded.");
            }
          }

          await refreshHeatmap();
          await loadUserData();
          if (!payload.audioBlob) {
            setStatusMessage("New reading captured and saved to the database.");
          }
          setIsCheckInOpen(false);
        } catch (error) {
          console.error(error);
          alert("Failed to save the reading to the database.");
        }
      },
      (error) => {
        console.error(error);
        alert("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePredictionSearch = async (event) => {
    event.preventDefault();
    setPredictionLoading(true);
    setPredictionError("");

    try {
      const resolvedLocality = chennaiLocalities.find((locality) => locality.name === selectedLocality);
      if (!resolvedLocality) {
        throw new Error("Please choose a locality from the Chennai list.");
      }
      const prediction = await getPredictedStress({
        lat: resolvedLocality.lat,
        lng: resolvedLocality.lng,
        targetTime: new Date(targetDateTime).toISOString(),
      });

      const enrichedPrediction = {
        ...prediction,
        locality_name: resolvedLocality.name,
      };

      setPredictionResult(enrichedPrediction);
      setReportResult(null);
      setReportError("");
      setCenter({
        lat: resolvedLocality.lat,
        lng: resolvedLocality.lng,
      });
      setStatusMessage(`Showing ${prediction.mode_label.toLowerCase()} for ${resolvedLocality.name}.`);
    } catch (error) {
      console.error(error);
      setPredictionResult(null);
      setPredictionError(
        error?.message || "Unable to generate a locality forecast right now."
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    const locality = chennaiLocalities.find((item) => item.name === selectedLocality);
    if (!locality) {
      setReportError("Please choose a locality first.");
      return;
    }

    setReportLoading(true);
    setReportError("");

    try {
      const report = await generateLocalityReport({
        lat: locality.lat,
        lng: locality.lng,
        localityName: locality.name,
      });
      setReportResult(report);
    } catch (error) {
      console.error(error);
      setReportError(error?.message || "Unable to prepare the locality report right now.");
      setReportResult(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (!reportResult) {
      return;
    }

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${reportResult.locality_name} Noise Report</title>
          <style>
            body { font-family: Georgia, serif; margin: 40px; color: #1b2b33; line-height: 1.5; }
            h1, h2 { margin-bottom: 8px; }
            .meta, .summary, .recommendations, .evidence { margin-top: 24px; }
            .evidence-item { border-top: 1px solid #d7deda; padding: 12px 0; }
          </style>
        </head>
        <body>
          <h1>Noise Stress Evidence Report</h1>
          <p><strong>Locality:</strong> ${reportResult.locality_name}</p>
          <p><strong>Generated:</strong> ${new Date(reportResult.generated_at).toLocaleString()}</p>
          <div class="meta">
            <p><strong>Average stress:</strong> ${reportResult.average_stress_score}</p>
            <p><strong>Peak stress:</strong> ${reportResult.peak_stress_score}</p>
            <p><strong>Night-time incidents:</strong> ${reportResult.nighttime_incident_count}</p>
            <p><strong>Audio evidence items:</strong> ${reportResult.audio_evidence_count}</p>
          </div>
          <div class="summary">
            <h2>Summary</h2>
            <p>${reportResult.summary}</p>
          </div>
          <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>${reportResult.recommendations.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <div class="evidence">
            <h2>Recent Evidence</h2>
            ${reportResult.evidence_items
              .map(
                (item) => `
                  <div class="evidence-item">
                    <p><strong>${item.incident_type || "Disturbance"}</strong> on ${new Date(item.timestamp).toLocaleString()}</p>
                    <p>Stress score: ${Number(item.stress_score).toFixed(2)} | Distance: ${item.distance_meters} m</p>
                    <p>${item.notes || "No written note attached."}</p>
                    ${item.audio_url ? `<p>Audio evidence: ${item.audio_url}</p>` : ""}
                  </div>
                `
              )
              .join("")}
          </div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="dashboard-shell">
      <Navbar />

      <main className="dashboard-page">
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="section-label">Environmental Intelligence</span>
            <h1>Track neighborhood noise stress with a cleaner live command center.</h1>
            <p>
              Compare your submitted readings, spot nearby hotspots, and capture new check-ins from
              a dashboard designed for presentations as well as day-to-day monitoring.
            </p>

            <div className="hero-actions">
              <button className="primary-cta" onClick={() => setIsCheckInOpen(true)}>
                Start Noise Check-In
              </button>
              <div className="hero-status-card">
                <span className="hero-status-label">Status</span>
                <strong>{statusMessage}</strong>
              </div>
            </div>
          </div>

          <div className="hero-spotlight">
            <div className="spotlight-card spotlight-card-main">
              <span>Current center</span>
              <strong>
                {formatCoordinate(center?.lat)}, {formatCoordinate(center?.lng)}
              </strong>
            </div>
            <div className="spotlight-card metric-spotlight metric-spotlight-light">
              <div className="metric-spotlight-icon" aria-hidden="true">
                ↗
              </div>
              <span>Average stress</span>
              <strong>{(stats.averageStress * 100).toFixed(1)}%</strong>
              <div className="metric-spotlight-bar">
                <div style={{ width: `${Math.min(100, Math.max(8, stats.averageStress * 100))}%` }} />
              </div>
            </div>
            <div className="spotlight-card metric-spotlight metric-spotlight-dark">
              <div className="metric-spotlight-icon" aria-hidden="true">
                ∣∣∣
              </div>
              <span>Peak personal reading</span>
              <strong>
                {(stats.highestStress * 100).toFixed(1)} <small>dB</small>
              </strong>
              <div className="metric-spotlight-mark" aria-hidden="true">
                ◖
              </div>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Your submissions</span>
            <strong>{stats.myReports}</strong>
            <p>Personal readings currently contributing to the map.</p>
          </article>
          <article className="stat-card">
            <span>Nearby reports</span>
            <strong>{stats.nearbyReports}</strong>
            <p>Shared neighborhood data points inside the active radius.</p>
          </article>
          <article className="stat-card">
            <span>Heatmap cells</span>
            <strong>{stats.heatZones}</strong>
            <p>Grid zones aggregated by backend stress intensity.</p>
          </article>
        </section>

        <section className="dashboard-content">
          <div className="map-panel">
            <div className="section-heading">
              <div>
                <span className="section-label">Live Map</span>
                <h2>Stress mapping viewport</h2>
              </div>
              <button className="secondary-cta" onClick={() => setIsCheckInOpen(true)}>
                Add Reading
              </button>
            </div>

            {center ? (
              <Map lat={center.lat} lng={center.lng} heatPoints={heatPoints} points={combinedPoints} />
            ) : (
              <div className="map-loading-card">
                <div className="map-loader" />
                <p>{isLoadingLocation ? "Initializing map and requesting location access..." : statusMessage}</p>
              </div>
            )}
          </div>

          <aside className="dashboard-sidebar">
            <div className="sidebar-card search-card">
              <span className="section-label">Temporal Explorer</span>
              <h3>Estimate stress for any locality and time</h3>
              <p>
                Search a place name, choose a past or future timestamp, and the system will estimate
                the likely noise stress using nearby historical readings and time-based trends.
              </p>

              <form className="prediction-form" onSubmit={handlePredictionSearch}>
                <label className="prediction-field">
                  <span>Locality</span>
                  <select
                    required
                    value={selectedLocality}
                    onChange={(event) => setSelectedLocality(event.target.value)}
                  >
                    {chennaiLocalities.map((locality) => (
                      <option key={locality.name} value={locality.name}>
                        {locality.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="prediction-field">
                  <span>Date and time</span>
                  <input
                    required
                    type="datetime-local"
                    value={targetDateTime}
                    onChange={(event) => setTargetDateTime(event.target.value)}
                  />
                </label>

                <button className="secondary-cta search-cta" disabled={predictionLoading} type="submit">
                  {predictionLoading ? "Estimating..." : "Analyze Locality"}
                </button>
              </form>
            </div>

            {(predictionError || predictionResult || reportError || reportResult) && (
              <div className="sidebar-card analysis-panel">
                <div className="analysis-panel-header">
                  <span className="section-label">Analysis Output</span>
                  <h3>Locality prediction and report</h3>
                </div>

                {predictionError && <p className="prediction-error">{predictionError}</p>}

                {predictionResult && (
                  <div className="prediction-result">
                    <div className="prediction-result-head">
                      <strong>{predictionResult.mode_label}</strong>
                      <span>{predictionResult.locality_name}</span>
                    </div>
                    <div className="prediction-score-row">
                      <div>
                        <span>Stress score</span>
                        <strong>{predictionResult.predicted_stress_score.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Confidence</span>
                        <strong>{Math.round(predictionResult.confidence * 100)}%</strong>
                      </div>
                    </div>
                    <div className="prediction-meta">
                      <p>Samples used: {predictionResult.samples_used}</p>
                      <p>Close time matches: {predictionResult.matching_samples}</p>
                      <p>Trend signal: {predictionResult.trend.toFixed(2)}</p>
                    </div>
                    <div className="report-actions">
                      <button className="secondary-cta" disabled={reportLoading} onClick={handleGenerateReport} type="button">
                        {reportLoading ? "Generating Report..." : "Generate Report"}
                      </button>
                    </div>
                  </div>
                )}

                {reportError && <p className="prediction-error">{reportError}</p>}

                {reportResult && (
                  <div className="report-card">
                    <div className="report-card-head">
                      <div>
                        <span className="section-label">Authority Report</span>
                        <h4>{reportResult.locality_name}</h4>
                      </div>
                      <button className="secondary-cta" onClick={handlePrintReport} type="button">
                        Print / Save PDF
                      </button>
                    </div>
                    <p>{reportResult.summary}</p>
                    <div className="report-metrics">
                      <p>Average stress: {reportResult.average_stress_score.toFixed(2)}</p>
                      <p>Peak stress: {reportResult.peak_stress_score.toFixed(2)}</p>
                      <p>Night incidents: {reportResult.nighttime_incident_count}</p>
                      <p>Audio proofs: {reportResult.audio_evidence_count}</p>
                    </div>
                    <div className="report-list">
                      {reportResult.recommendations.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="sidebar-card method-card">
              <span className="section-label">Method</span>
              <h3>How this dashboard reads the environment</h3>
              <p>
                Each check-in captures a short microphone sample, computes an RMS value, converts it
                into a stress score, and then refreshes both your personal markers and the area
                heatmap.
              </p>
            </div>

            <div className="sidebar-card interpretation-card">
              <span className="section-label">Interpretation</span>
              <h3>Quick reading guide</h3>
              <ul className="reading-guide">
                <li>White haze indicates lighter observed stress and fewer concentrated reports.</li>
                <li>Peach to coral suggests a rising disturbance pattern in the surrounding cells.</li>
                <li>Deep red marks the strongest recurring hotspot clusters on the map.</li>
              </ul>
            </div>

            <div className="sidebar-card evidence-link-card">
              <span className="section-label">Evidence Vault</span>
              <h3>Your saved recordings live in one place</h3>
              <p>
                Review incident notes, replay uploaded audio, and keep a dedicated record of your
                strongest evidence without crowding the main dashboard.
              </p>
              <Link className="secondary-cta evidence-link" to="/evidence">
                Open Evidence Page
              </Link>
            </div>
          </aside>

        </section>
      </main>

      {isCheckInOpen && (
        <NoiseCheckInModal
          onClose={() => setIsCheckInOpen(false)}
          onNoiseDetected={handleNoiseDetected}
        />
      )}
    </div>
  );
}

export default App;
