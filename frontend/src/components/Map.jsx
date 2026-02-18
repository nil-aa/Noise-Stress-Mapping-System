import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue in React/Vite builds
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * points: [{ lat, lng, rms, peak, createdAt }]
 */
const Map = ({ lat = 13.0827, lng = 80.2707, zoom = 16, points = [], heatPoints = [] }) => {
  const center = [lat, lng];

  return (
    <div style={{ height: "70vh", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Center marker (optional: your default location) */}
        {/* <Marker position={center}>
          <Popup>
            Center: {lat}, {lng}
          </Popup>
        </Marker> */}

        {/* Noise points */}
        {points.map((p, idx) => (
          <Marker key={`${p.createdAt || idx}-${idx}`} position={[p.lat, p.lng]}>
            <Popup>
              <div>
                <div><b>Noise detected</b></div>
                <div>Lat/Lng: {p.lat.toFixed(6)}, {p.lng.toFixed(6)}</div>
                {typeof p.rms === "number" && <div>RMS: {p.rms.toFixed(4)}</div>}
                {typeof p.peak === "number" && <div>Peak: {p.peak.toFixed(4)}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        {/* Backend grid points (from noise.db via /heatmap-data) */}
        {/* {heatPoints.map((p, idx) => (
        <Marker
            key={`heat-${p.latitude}-${p.longitude}-${idx}`}
            position={[p.latitude, p.longitude]}
        >
            <Popup>
            <div>
                <div><b>Heatmap grid</b></div>
                <div>Avg stress: {Number(p.average_stress).toFixed(3)}</div>
                <div>Reports: {p.count}</div>
                <div>Lat/Lng: {Number(p.latitude).toFixed(6)}, {Number(p.longitude).toFixed(6)}</div>
            </div>
            </Popup>
        </Marker>
        ))} */}
      </MapContainer>
    </div>
  );
};

export default Map;
