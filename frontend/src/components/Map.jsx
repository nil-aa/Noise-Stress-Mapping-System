import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import "leaflet.heat";
import "./Map.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const myIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -38],
  shadowSize: [41, 41],
  className: "marker-mine",
});

const otherIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "marker-other",
});

const predictionIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [1, -36],
  shadowSize: [41, 41],
  className: "marker-prediction",
});

function Heatmap({ heatPoints }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !heatPoints || heatPoints.length === 0) {
      return undefined;
    }

    const heatData = heatPoints
      .filter((point) => point.latitude && point.longitude)
      .map((point) => [
        Number(point.latitude),
        Number(point.longitude),
        Number(point.average_stress),
      ]);

    if (heatData.length === 0) {
      return undefined;
    }

    const heatLayer = L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      max: 1,
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
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <RecenterMap center={center} zoom={zoom} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

      <div className="heatmap-scale">
        <div className="scale-label top">High</div>
        <div className="scale-gradient" />
        <div className="scale-label bottom">Low</div>
      </div>
    </div>
  );
}

export default Map;
