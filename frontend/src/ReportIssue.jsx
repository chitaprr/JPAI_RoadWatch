import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
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

// Domyślny środek mapy (Kraków), gdy nie znamy jeszcze lokalizacji użytkownika.
const DEFAULT_CENTER = [50.0647, 19.945];

// Ustawia pinezkę tam, gdzie użytkownik kliknie na mapie.
function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

// Przesuwa widok mapy, gdy geolokalizacja zwróci współrzędne.
function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);
  return null;
}

function ReportIssue() {
  // 1. Pamięć podręczna na dane formularza, plik i lokalizację.
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]); // od 1 do 5 plików
  const [position, setPosition] = useState(null); // [lat, lng]
  const [gminy, setGminy] = useState([]);
  const [gminaId, setGminaId] = useState(""); // wybrana gmina (wymagana)
  // Zalogowany = jest token. Wtedy zgłoszenie idzie z tokenem (przypięte do
  // konta), a pole email jest ukryte (backend bierze email z konta).
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );

  const MAX_PHOTOS = 5;

  const navigate = useNavigate();

  // Próba pobrania lokalizacji urządzenia. Jeśli użytkownik nie wyrazi zgody,
  // wskaże punkt sam, klikając na mapie.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}, // brak zgody/błąd — zostaje wybór ręczny na mapie
    );
  }, []);

  // Lista gmin do wyboru — publiczna (działa też dla gościa).
  useEffect(() => {
    api
      .get("/gminy", { skipAuth: true })
      .then((res) => setGminy(res.data.gminy ?? []))
      .catch(() => setGminy([]));
  }, []);

  // 2. Co się dzieje po kliknięciu "Wyślij zgłoszenie".
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!position) {
      alert("Wskaż lokalizację usterki, klikając na mapie.");
      return;
    }
    if (photos.length === 0) {
      alert("Dołącz przynajmniej jedno zdjęcie usterki.");
      return;
    }
    if (photos.length > MAX_PHOTOS) {
      alert(`Możesz dołączyć maksymalnie ${MAX_PHOTOS} zdjęć.`);
      return;
    }
    if (!gminaId) {
      alert("Wybierz gminę, której dotyczy zgłoszenie.");
      return;
    }

    // Backend przyjmuje multipart/form-data; pliki w polu "zdjecia" (do 5).
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    // Email tylko dla gościa; zalogowany ma go brany z konta po stronie backendu.
    if (!isLoggedIn) formData.append("email", email);
    formData.append("lat", position[0]);
    formData.append("lng", position[1]);
    formData.append("gminaId", gminaId);
    photos.forEach((photo) => formData.append("zdjecia", photo));

    try {
      // Zalogowany -> wysyłamy z tokenem (zgłoszenie przypięte do konta).
      // Gość -> skipAuth, żeby ewentualny resztkowy token nie został odrzucony.
      await api.post("/zgloszenia", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        skipAuth: !isLoggedIn,
      });
      alert("Zgłoszenie zostało pomyślnie wysłane!");
      navigate("/");
    } catch (error) {
      // Token wygasł/niepoprawny: czyścimy go i odsłaniamy pole email,
      // by można było wysłać ponownie jako gość.
      if (error.response?.status === 403 && isLoggedIn) {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        alert(
          "Twoja sesja wygasła. Uzupełnij adres e-mail i wyślij zgłoszenie ponownie.",
        );
        return;
      }
      // 409 = istnieją zgłoszenia w pobliżu (możliwy duplikat).
      if (error.response?.status === 409) {
        alert("W pobliżu istnieje już podobne zgłoszenie.");
      } else {
        alert("Wystąpił błąd podczas wysyłania zgłoszenia.");
      }
    }
  };

  // 3. Wygląd formularza.
  return (
    <div>
      <Navbar />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "40px",
          marginBottom: "40px",
        }}
      >
        <h2>Zgłoś usterkę drogową</h2>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            width: "350px",
          }}
        >
          {!isLoggedIn && (
            <input
              type="email"
              placeholder="Twój adres e-mail (do kontaktu)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          <input
            type="text"
            placeholder="Krótki tytuł (np. Dziura w asfalcie)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="Dokładny opis sytuacji..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="5"
            required
          />

          <select
            value={gminaId}
            onChange={(e) => setGminaId(e.target.value)}
            required
          >
            <option value="">— Wybierz gminę —</option>
            {gminy.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <label style={{ fontSize: "14px", fontWeight: "bold" }}>
            Wskaż lokalizację usterki na mapie:
          </label>
          <MapContainer
            center={position || DEFAULT_CENTER}
            zoom={13}
            style={{ height: "300px", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationPicker position={position} setPosition={setPosition} />
            <Recenter position={position} />
          </MapContainer>
          <small style={{ color: "#666" }}>
            {position
              ? `Wybrano: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
              : "Kliknij na mapie, aby wskazać miejsce usterki."}
          </small>

          <label style={{ fontSize: "14px", fontWeight: "bold" }}>
            Dołącz zdjęcia dowodowe (od 1 do {MAX_PHOTOS}):
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setPhotos(Array.from(e.target.files).slice(0, MAX_PHOTOS))
            }
            required
          />
          {photos.length > 0 && (
            <small style={{ color: "#666" }}>
              Wybrano {photos.length} z {MAX_PHOTOS} zdjęć.
            </small>
          )}

          <button
            type="submit"
            style={{
              padding: "10px",
              cursor: "pointer",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
            }}
          >
            Wyślij zgłoszenie
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReportIssue;
