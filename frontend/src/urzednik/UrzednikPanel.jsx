import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../Navbar";

// Ikona markera Leaflet gubi ścieżki przy bundlowaniu (Vite) — ustawiamy ręcznie.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER = [50.0647, 19.945]; // Kraków
const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/"
).replace(/\/+$/, "");

const STATUSY = ["Nowe", "W trakcie", "Zaakceptowane", "Zlecone", "Zakończone"];
const PRIORYTETY = [0, 1, 2, 3];

const td = {
  padding: "8px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
};
const th = {
  ...td,
  textAlign: "left",
  fontWeight: "bold",
  background: "#f9fafb",
};

// Panel urzędnika — backend zwraca tylko zgłoszenia z jego gminy (scoping),
// więc tutaj nie filtrujemy po gminie. Domyka MUST #6–#8 w UI.
function UrzednikPanel() {
  const me = getUser();
  const [rows, setRows] = useState([]);
  const [wykonawcy, setWykonawcy] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [z, w] = await Promise.all([
        api.get("/zgloszenia"),
        api.get("/wykonawcy"),
      ]);
      setRows(z.data.zgloszenia ?? []);
      setWykonawcy(w.data.wykonawcy ?? []);
    } catch {
      setError("Nie udało się pobrać zgłoszeń. Czy masz rolę urzędnika?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pobranie danych przy montażu (legalny efekt) — celowo setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const patchRow = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const numOrNull = (v) => (v === "" ? null : Number(v));

  const save = async (row, extra = {}) => {
    setError("");
    try {
      await api.patch(`/zgloszenia/${row.id}`, {
        status: row.status,
        priority: Number(row.priority),
        contractorId: row.contractorId ?? null,
        deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
        ...extra,
      });
      await load();
    } catch {
      setError(`Nie udało się zapisać zgłoszenia #${row.id}.`);
    }
  };

  const statusOptions = (current) =>
    STATUSY.includes(current) ? STATUSY : [current, ...STATUSY];

  // Filtrowanie po statusie (po stronie klienta).
  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => r.status === statusFilter) : rows),
    [rows, statusFilter],
  );

  // Środek mapy: pierwsze zgłoszenie z listy albo domyślny.
  const center = useMemo(() => {
    const first = filtered[0];
    return first ? [Number(first.lat), Number(first.lng)] : DEFAULT_CENTER;
  }, [filtered]);

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>
          Panel urzędnika
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "16px", fontSize: "14px" }}>
          Zgłoszenia z Twojej gminy. Zmieniaj status, priorytet, przypisuj
          wykonawcę i termin.
        </p>

        {error && (
          <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "14px", marginRight: "8px" }}>
            Filtr statusu:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {STATUSY.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span
            style={{ marginLeft: "12px", color: "#6b7280", fontSize: "13px" }}
          >
            {filtered.length} zgłoszeń
          </span>
        </div>

        {/* Mapa zgłoszeń (po filtrze) */}
        <div
          style={{
            height: "360px",
            marginBottom: "20px",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {filtered.map((z) => (
              <Marker key={z.id} position={[Number(z.lat), Number(z.lng)]}>
                <Popup>
                  <strong>
                    #{z.id} {z.title}
                  </strong>
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

        {loading ? (
          <p>Ładowanie…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Tytuł</th>
                  <th style={th}>Status</th>
                  <th style={th}>Priorytet</th>
                  <th style={th}>Wykonawca</th>
                  <th style={th}>Termin</th>
                  <th style={th}>Przypisany</th>
                  <th style={th}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.id}</td>
                    <td style={td} title={r.description}>
                      {r.title}
                    </td>
                    <td style={td}>
                      <select
                        value={r.status}
                        onChange={(e) =>
                          patchRow(r.id, "status", e.target.value)
                        }
                      >
                        {statusOptions(r.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <select
                        value={r.priority}
                        onChange={(e) =>
                          patchRow(r.id, "priority", Number(e.target.value))
                        }
                      >
                        {PRIORYTETY.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <select
                        value={r.contractorId ?? ""}
                        onChange={(e) =>
                          patchRow(
                            r.id,
                            "contractorId",
                            numOrNull(e.target.value),
                          )
                        }
                      >
                        <option value="">—</option>
                        {wykonawcy.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        value={r.deadline ? r.deadline.slice(0, 10) : ""}
                        onChange={(e) =>
                          patchRow(r.id, "deadline", e.target.value || null)
                        }
                      />
                    </td>
                    <td style={td}>
                      {r.urzednikId
                        ? r.urzednikId === me?.id
                          ? "Ty"
                          : `#${r.urzednikId}`
                        : "—"}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => save(r)}
                        style={{ marginRight: "6px", cursor: "pointer" }}
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => save(r, { urzednikId: me?.id })}
                        style={{ cursor: "pointer" }}
                        title="Przypisz to zgłoszenie do siebie"
                      >
                        Przypisz do mnie
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UrzednikPanel;
