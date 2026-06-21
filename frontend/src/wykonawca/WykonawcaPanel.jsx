import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../Navbar";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/"
).replace(/\/+$/, "");

const Thumb = ({ filePath, alt }) => (
  <img
    src={`${API_ORIGIN}${filePath}`}
    alt={alt}
    style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "4px" }}
  />
);

// Pojedyncze zlecenie + akcje wykonawcy (status, zapis naprawy ze zdjęciami).
function ZlecenieCard({ z, onChanged }) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const done = z.status === "Zakończone";

  const setStatus = async (status) => {
    setError("");
    setBusy(true);
    try {
      await api.patch(`/zgloszenia/${z.id}/status`, { status });
      await onChanged();
    } catch {
      setError("Nie udało się zmienić statusu.");
    } finally {
      setBusy(false);
    }
  };

  const saveNaprawa = async (e) => {
    e.preventDefault();
    if (photos.length === 0) {
      setError("Dodaj co najmniej jedno zdjęcie po naprawie.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("zadanieId", z.id);
      fd.append("description", description);
      photos.forEach((p) => fd.append("zdjecia", p));
      await api.post("/naprawy", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDescription("");
      setPhotos([]);
      await onChanged();
    } catch {
      setError("Nie udało się zapisać naprawy.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
        <strong style={{ fontSize: "16px" }}>
          #{z.id} {z.title}
        </strong>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: "999px",
            background: done ? "#dcfce7" : "#eef2ff",
            color: done ? "#166534" : "#3730a3",
            fontSize: "13px",
            fontWeight: "bold",
            height: "fit-content",
            whiteSpace: "nowrap",
          }}
        >
          {z.status}
        </span>
      </div>

      <p style={{ margin: "8px 0", color: "#374151", fontSize: "14px" }}>
        {z.description}
      </p>
      <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>
        {z.gmina?.name && <span>Gmina: {z.gmina.name}</span>}
      </div>

      {z.zdjecia?.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
            Zdjęcia zgłoszenia:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {z.zdjecia.map((zd) => (
              <Thumb key={zd.id} filePath={zd.filePath} alt="Usterka" />
            ))}
          </div>
        </div>
      )}

      {/* Naprawy już zapisane (zdjęcia „po") */}
      {z.naprawy?.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            marginTop: "10px",
            paddingTop: "10px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
            Naprawy:
          </div>
          {z.naprawy.map((n) => (
            <div key={n.id} style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "14px", color: "#374151" }}>
                {n.description} ·{" "}
                <span style={{ color: "#6b7280" }}>
                  {new Date(n.completedAt).toLocaleDateString("pl-PL")}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                {n.zdjecia?.map((zd) => (
                  <Thumb key={zd.id} filePath={zd.filePath} alt="Po naprawie" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: "#b91c1c", fontSize: "14px" }}>{error}</p>}

      {/* Akcje — tylko dla niezakończonych */}
      {!done && (
        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "10px", paddingTop: "12px" }}>
          {z.status !== "W realizacji" && (
            <button
              onClick={() => setStatus("W realizacji")}
              disabled={busy}
              style={{
                marginBottom: "12px",
                padding: "8px 14px",
                cursor: "pointer",
                background: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Rozpocznij realizację
            </button>
          )}

          <form onSubmit={saveNaprawa} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <textarea
              placeholder="Opis wykonanej naprawy…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="2"
              required
            />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files).slice(0, 5))}
            />
            {photos.length > 0 && (
              <small style={{ color: "#6b7280" }}>Wybrano {photos.length} zdjęć.</small>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "8px 14px",
                cursor: "pointer",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "5px",
                alignSelf: "flex-start",
              }}
            >
              Zakończ — zapisz naprawę
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function WykonawcaPanel() {
  const [zlecenia, setZlecenia] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/zgloszenia/zlecone");
      setZlecenia(res.data.zgloszenia ?? []);
    } catch {
      setError("Nie udało się pobrać zleceń. Czy masz rolę wykonawcy?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pobranie danych przy montażu (legalny efekt) — celowo setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "4px" }}>
          Panel wykonawcy
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "16px", fontSize: "14px" }}>
          Zlecenia przypisane do Twojej firmy. Oznaczaj realizację i dodawaj
          zdjęcia po naprawie.
        </p>

        {error && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>}

        {loading ? (
          <p>Ładowanie…</p>
        ) : zlecenia.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Brak przypisanych zleceń.</p>
        ) : (
          zlecenia.map((z) => (
            <ZlecenieCard key={z.id} z={z} onChanged={load} />
          ))
        )}
      </div>
    </div>
  );
}

export default WykonawcaPanel;
