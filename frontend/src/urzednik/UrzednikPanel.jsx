import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../Navbar";
import { exportCsv, exportPdf } from "../utils/export";

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
  // Szczegóły wybranego zgłoszenia (z naprawami i opisem od wykonawcy).
  const [detail, setDetail] = useState(null);
  const [komentarze, setKomentarze] = useState([]);
  const [historia, setHistoria] = useState([]);
  const [newComment, setNewComment] = useState("");
  // Statystyki (z opcjonalnym zakresem dat).
  const [stats, setStats] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadStats = async () => {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get("/zgloszenia/statystyki", { params });
      setStats(res.data.statystyki);
    } catch {
      // Statystyki są dodatkiem — błąd nie blokuje panelu.
    }
  };

  const openDetail = async (id) => {
    setError("");
    setNewComment("");
    try {
      const [z, k, h] = await Promise.all([
        api.get(`/zgloszenia/${id}`),
        api.get(`/zgloszenia/${id}/komentarze`),
        api.get(`/zgloszenia/${id}/historia`),
      ]);
      setDetail(z.data.zgloszenie);
      setKomentarze(k.data.komentarze ?? []);
      setHistoria(h.data.historia ?? []);
    } catch {
      setError(`Nie udało się pobrać szczegółów zgłoszenia #${id}.`);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !detail) return;
    try {
      await api.post(`/zgloszenia/${detail.id}/komentarze`, {
        content: newComment.trim(),
      });
      const res = await api.get(`/zgloszenia/${detail.id}/komentarze`);
      setKomentarze(res.data.komentarze ?? []);
      setNewComment("");
    } catch {
      setError("Nie udało się dodać komentarza.");
    }
  };

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
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Nazwa firmy wykonawcy po id — używana w eksporcie.
  const wykonawcaName = (id) => wykonawcy.find((w) => w.id === id)?.name ?? "";

  // Wzbogacenie wierszy o nazwę wykonawcy do eksportu CSV/PDF.
  const exportRows = () =>
    filtered.map((r) => ({
      ...r,
      wykonawcaName: wykonawcaName(r.contractorId),
    }));

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
          <button
            onClick={() => exportCsv(exportRows())}
            style={{ marginLeft: "12px", cursor: "pointer" }}
          >
            Eksport CSV
          </button>
          <button
            onClick={() => exportPdf(exportRows())}
            style={{ marginLeft: "6px", cursor: "pointer" }}
          >
            Eksport PDF
          </button>
        </div>

        {/* Statystyki gminy */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "16px",
            padding: "12px 16px",
            marginBottom: "20px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          <strong>Statystyki:</strong>
          {stats ? (
            <>
              <span>
                Łącznie: <b>{stats.total}</b>
              </span>
              <span>
                Zakończone: <b>{stats.resolvedCount}</b>
              </span>
              <span>
                Śr. czas realizacji:{" "}
                <b>
                  {stats.avgResolutionDays !== null
                    ? `${stats.avgResolutionDays} dni`
                    : "—"}
                </b>
              </span>
              <span style={{ color: "#6b7280" }}>
                {Object.entries(stats.byStatus)
                  .map(([s, n]) => `${s}: ${n}`)
                  .join(" · ")}
              </span>
            </>
          ) : (
            <span style={{ color: "#6b7280" }}>Ładowanie…</span>
          )}
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: "13px" }}>od</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <label style={{ fontSize: "13px" }}>do</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <button onClick={loadStats} style={{ cursor: "pointer" }}>
              Filtruj
            </button>
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
                        onClick={() => openDetail(r.id)}
                        style={{ marginRight: "6px", cursor: "pointer" }}
                      >
                        Szczegóły
                      </button>
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

      {detail && (
        <div
          onClick={() => setDetail(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
            zIndex: 1200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "20px",
              maxWidth: "640px",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "20px", margin: 0 }}>
                #{detail.id} {detail.title}
              </h2>
              <button
                onClick={() => setDetail(null)}
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                color: "#6b7280",
                fontSize: "13px",
                margin: "4px 0 12px",
              }}
            >
              Status: {detail.status}
              {detail.gmina?.name && ` · Gmina: ${detail.gmina.name}`}
              {detail.email && ` · Zgłaszający: ${detail.email}`}
            </p>

            <h3 style={{ fontSize: "15px", margin: "0 0 4px" }}>
              Opis usterki
            </h3>
            <p style={{ fontSize: "14px", color: "#374151", marginTop: 0 }}>
              {detail.description}
            </p>

            {detail.zdjecia?.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                {detail.zdjecia.map((zd) => (
                  <img
                    key={zd.id}
                    src={`${API_ORIGIN}${zd.filePath}`}
                    alt="Usterka"
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                ))}
              </div>
            )}

            <h3 style={{ fontSize: "15px", margin: "8px 0 6px" }}>
              Naprawy (od wykonawcy)
            </h3>
            {detail.naprawy?.length > 0 ? (
              detail.naprawy.map((n) => (
                <div
                  key={n.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ fontSize: "14px", color: "#374151" }}>
                    {n.description}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "6px",
                    }}
                  >
                    Zakończono:{" "}
                    {new Date(n.completedAt).toLocaleDateString("pl-PL")}
                  </div>
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    {n.zdjecia?.map((zd) => (
                      <img
                        key={zd.id}
                        src={`${API_ORIGIN}${zd.filePath}`}
                        alt="Po naprawie"
                        style={{
                          width: "120px",
                          height: "120px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Brak napraw — wykonawca jeszcze nie dodał opisu.
              </p>
            )}

            {/* Komentarze / notatki wewnętrzne */}
            <h3 style={{ fontSize: "15px", margin: "16px 0 6px" }}>
              Komentarze (notatki wewnętrzne)
            </h3>
            {komentarze.length > 0 ? (
              komentarze.map((k) => (
                <div
                  key={k.id}
                  style={{
                    fontSize: "14px",
                    padding: "6px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ color: "#374151" }}>{k.content}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {k.authorName} ·{" "}
                    {new Date(k.createdAt).toLocaleString("pl-PL")}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Brak komentarzy.
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Dodaj notatkę…"
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
              />
              <button onClick={addComment} style={{ cursor: "pointer" }}>
                Dodaj
              </button>
            </div>

            {/* Historia zmian (audit log) */}
            <h3 style={{ fontSize: "15px", margin: "16px 0 6px" }}>
              Historia zmian
            </h3>
            {historia.length > 0 ? (
              <ul
                style={{
                  fontSize: "13px",
                  color: "#374151",
                  paddingLeft: "18px",
                }}
              >
                {historia.map((h) => (
                  <li key={h.id} style={{ marginBottom: "2px" }}>
                    <span style={{ color: "#6b7280" }}>
                      {new Date(h.createdAt).toLocaleString("pl-PL")} ·{" "}
                      {h.userName} ·{" "}
                    </span>
                    {h.field === "utworzenie"
                      ? `utworzono (status: ${h.newValue})`
                      : `${h.field}: ${h.oldValue ?? "—"} → ${h.newValue ?? "—"}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Brak historii.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UrzednikPanel;
