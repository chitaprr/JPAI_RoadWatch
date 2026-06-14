import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import api from "./services/api";
import Navbar from "./Navbar";

// Domyślna ikona markera Leaflet gubi ścieżki przy bundlowaniu (Vite) — ustawiamy ją ręcznie.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER = [50.0647, 19.945]; // Kraków
// Origin backendu bez końcowego "/" — do budowania URL-i zdjęć.
const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/"
).replace(/\/+$/, "");

function Map() {
  const [zgloszenia, setZgloszenia] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Publiczny odczyt — bez tokena (skipAuth), żeby ewentualny resztkowy token
    // nie wywołał globalnego wylogowania na 403.
    api
      .get("/zgloszenia/public", { skipAuth: true })
      .then((res) => setZgloszenia(res.data.zgloszenia ?? []))
      .catch(() => setError("Nie udało się pobrać zgłoszeń."));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar />

      {error && (
        <div
          style={{
            padding: "8px 20px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ flex: 1 }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {zgloszenia.map((z) => (
            <Marker key={z.id} position={[Number(z.lat), Number(z.lng)]}>
              <Popup>
                <strong>{z.title}</strong>
                <br />
                <span>Status: {z.status}</span>
                <br />
                <span>{z.description}</span>
                {z.zdjecia?.[0] && (
                  <>
                    <br />
                    <img
                      src={`${API_ORIGIN}${z.zdjecia[0].filePath}`}
                      alt={z.title}
                      style={{
                        marginTop: "6px",
                        maxWidth: "200px",
                        borderRadius: "4px",
                      }}
                    />
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default Map;
