import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function Map() {
  const navigate = useNavigate();

  return (
    // Dodałem position: "relative", żeby przycisk nie "uciekł" poza ekran
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* NASZ NOWY PRZYCISK */}
      <button
        onClick={() => navigate("/zgloszenie")}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 1000, // To sprawia, że przycisk zawsze wyświetla się NAD mapą
          padding: "12px 20px",
          cursor: "pointer",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontWeight: "bold",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)", // Mały cień dla lepszego wyglądu
        }}
      >
        + Nowe Zgłoszenie
      </button>

      {/* TWOJA MAPA (zupełnie bez zmian) */}
      <MapContainer
        center={[50.0647, 19.945]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[50.0647, 19.945]}>
          <Popup>JPAI RoadWatch - Nasza pierwsza pinezka!</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default Map;
