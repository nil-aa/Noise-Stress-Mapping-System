import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import "leaflet.heat";
import "./Map.css";

function createPinIcon(className, size = "medium") {
  return L.divIcon({
    className: "custom-pin-icon-wrapper",
    html: `<div class="custom-pin ${className} custom-pin-${size}"><span></span></div>`,
    iconSize: size === "small" ? [22, 30] : size === "large" ? [30, 40] : [26, 34],
    iconAnchor: size === "small" ? [11, 28] : size === "large" ? [15, 38] : [13, 32],
    popupAnchor: [0, -28],
  });
}

const myIcon = createPinIcon("custom-pin-mine", "large");
const otherIcon = createPinIcon("custom-pin-other", "medium");
const predictionIcon = createPinIcon("custom-pin-prediction", "small");

const heatGradient = {
  0.1: "#fff8f1",
  0.28: "#ffdccc",
  0.46: "#ffb197",
  0.64: "#ff6a55",
  0.82: "#d92020",
  1.0: "#6d0505",
};

function Heatmap({ heatPoints }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !heatPoints || heatPoints.length === 0) {
      return undefined;
    }

    const heatData = heatPoints
      .filter((point) => point.latitude != null && point.longitude != null)
      .map((point) => [
        Number(point.latitude),
        Number(point.longitude),
        Number(point.average_stress),
      ]);

    if (heatData.length === 0) {
      return undefined;
    }

    const heatLayer = L.heatLayer(heatData, {
      radius: 42,
      blur: 30,
      maxZoom: 17,
      max: 1,
      minOpacity: 0.34,
      gradient: heatGradient,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [heatPoints, map]);

  return null;
}

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, {
      animate: true,
      duration: 0.75,
    });
  }, [center, map, zoom]);

  return null;
}

function Map({ lat = 13.0827, lng = 80.2707, zoom = 16, points = [], heatPoints = [] }) {
  const center = [lat, lng];

  return (
    <div className="map-shell">
      <div className="map-shell-grid" aria-hidden="true" />
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <RecenterMap center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <Heatmap heatPoints={heatPoints} />

        {points.map((point, index) => (
          <Marker
            key={`${point.createdAt || index}-${index}`}
            position={[point.lat, point.lng]}
            icon={
              point.type === "mine"
                ? myIcon
                : point.type === "prediction"
                  ? predictionIcon
                  : otherIcon
            }
          >
            <Popup>
              <div className="map-popup">
                <div>
                  <b>
                    {point.type === "mine"
                      ? "Your reading"
                      : point.type === "prediction"
                        ? "Predicted locality stress"
                        : "Community reading"}
                  </b>
                </div>
                {point.label && <div>{point.label}</div>}
                <div>
                  Lat/Lng: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                </div>
                {point.incidentType && <div>Incident: {point.incidentType}</div>}
                {typeof point.rms === "number" && <div>Stress score: {point.rms.toFixed(4)}</div>}
                {typeof point.peak === "number" && <div>Peak: {point.peak.toFixed(4)}</div>}
                {point.notes && <div>Notes: {point.notes}</div>}
                {point.predictionMeta?.target_time && (
                  <div>Time: {new Date(point.predictionMeta.target_time).toLocaleString()}</div>
                )}
                {typeof point.predictionMeta?.confidence === "number" && (
                  <div>Confidence: {Math.round(point.predictionMeta.confidence * 100)}%</div>
                )}
                {point.audioUrl && (
                  <div style={{ marginTop: 8 }}>
                    <audio controls preload="none" src={point.audioUrl} style={{ width: "100%" }} />
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-marker-legend">
        <div className="map-marker-key">
          <span className="map-key-dot map-key-dot-mine" />
          Your readings
        </div>
        <div className="map-marker-key">
          <span className="map-key-dot map-key-dot-other" />
          Community
        </div>
        <div className="map-marker-key">
          <span className="map-key-dot map-key-dot-prediction" />
          Prediction
        </div>
      </div>

      <div className="heatmap-scale">
        <div className="scale-label top">High</div>
        <div className="scale-gradient" />
        <div className="scale-label bottom">Low</div>
      </div>
    </div>
  );
}

export default Map;
