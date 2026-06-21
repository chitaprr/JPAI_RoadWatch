import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "./services/api";
import { isLoggedIn } from "./services/auth";
import Navbar from "./Navbar";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/"
).replace(/\/+$/, "");

// Pojedyncza karta zgłoszenia (współdzielona przez listę i wynik lookupu).
function ZgloszenieCard({ z }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "14px",
        marginBottom: "12px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <strong style={{ fontSize: "16px" }}>
          #{z.id} {z.title}
        </strong>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: "999px",
            background: "#eef2ff",
            color: "#3730a3",
            fontSize: "13px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            height: "fit-content",
          }}
        >
          {z.status}
        </span>
      </div>
      <p style={{ margin: "8px 0", color: "#374151", fontSize: "14px" }}>
        {z.description}
      </p>
      <div style={{ color: "#6b7280", fontSize: "13px" }}>
        {z.gmina?.name && <span>Gmina: {z.gmina.name} · </span>}
        <span>Zgłoszono: {new Date(z.createdAt).toLocaleDateString("pl-PL")}</span>
        {z.deadline && (
          <span> · Termin: {new Date(z.deadline).toLocaleDateString("pl-PL")}</span>
        )}
      </div>
      {z.zdjecia?.[0] && (
        <img
          src={`${API_ORIGIN}${z.zdjecia[0].filePath}`}
          alt={z.title}
          style={{
            marginTop: "10px",
            maxWidth: "220px",
            borderRadius: "4px",
          }}
        />
      )}
    </div>
  );
}

function MojeZgloszenia() {
  const loggedIn = isLoggedIn();
  const location = useLocation();
  // Zgłoszenie świeżo utworzone (przekazane z formularza) — pokazujemy numer.
  const created = location.state?.created ?? null;

  // Lista własnych zgłoszeń (tylko dla zalogowanych).
  const [moje, setMoje] = useState([]);
  const [mojeError, setMojeError] = useState("");
  const [loading, setLoading] = useState(loggedIn);

  // Lookup gościa po ID + email — prefill danymi świeżego zgłoszenia (gość).
  const [lookupId, setLookupId] = useState(created ? String(created.id) : "");
  const [lookupEmail, setLookupEmail] = useState(created?.email ?? "");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupMsg, setLookupMsg] = useState("");

  const loadMoje = async () => {
    try {
      const res = await api.get("/zgloszenia/moje");
      setMoje(res.data.zgloszenia ?? []);
    } catch {
      setMojeError("Nie udało się pobrać Twoich zgłoszeń.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    // Pobranie danych przy montażu (legalny efekt) — celowo setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMoje();
  }, [loggedIn]);

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupResult(null);
    setLookupMsg("");
    try {
      const res = await api.get("/zgloszenia/lookup", {
        params: { id: lookupId, email: lookupEmail },
        skipAuth: true,
      });
      setLookupResult(res.data.zgloszenie);
    } catch (err) {
      if (err.response?.status === 404) {
        setLookupMsg(
          "Nie znaleziono zgłoszenia o podanym numerze i adresie e-mail.",
        );
      } else {
        setLookupMsg("Wystąpił błąd podczas wyszukiwania.");
      }
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
          Moje zgłoszenia
        </h1>

        {/* Potwierdzenie świeżo utworzonego zgłoszenia — kluczowe dla gościa,
            który zapamiętuje numer do późniejszego sprawdzenia statusu. */}
        {created && (
          <section
            style={{
              border: "1px solid #6ee7b7",
              background: "#ecfdf5",
              borderRadius: "8px",
              padding: "14px",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", margin: "0 0 6px", color: "#065f46" }}>
              Zgłoszenie zostało utworzone ✅
            </h2>
            <p style={{ margin: "0 0 12px", color: "#065f46", fontSize: "14px" }}>
              Twój numer zgłoszenia: <strong>#{created.id}</strong>. Zapisz go —
              razem z adresem e-mail pozwala sprawdzić status poniżej.
            </p>
            <ZgloszenieCard z={created} />
          </section>
        )}

        {/* Sekcja dla zalogowanych — własne zgłoszenia przypięte do konta */}
        {loggedIn && (
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>
              Zgłoszenia z Twojego konta
            </h2>
            {mojeError && <p style={{ color: "#b91c1c" }}>{mojeError}</p>}
            {loading ? (
              <p>Ładowanie…</p>
            ) : moje.length === 0 ? (
              <p style={{ color: "#6b7280" }}>
                Nie masz jeszcze żadnych zgłoszeń.
              </p>
            ) : (
              moje.map((z) => <ZgloszenieCard key={z.id} z={z} />)
            )}
          </section>
        )}

        {/* Sekcja dla wszystkich — sprawdzenie statusu po numerze i e-mailu */}
        <section>
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
            Sprawdź status zgłoszenia
          </h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "12px" }}>
            Zgłaszałeś jako gość? Podaj numer zgłoszenia i e-mail użyty przy
            zgłoszeniu.
          </p>
          <form
            onSubmit={handleLookup}
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <input
              type="number"
              placeholder="Numer zgłoszenia"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              required
              style={{ width: "150px" }}
            />
            <input
              type="email"
              placeholder="Adres e-mail"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              required
              style={{ width: "220px" }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Sprawdź
            </button>
          </form>

          {lookupMsg && <p style={{ color: "#b91c1c" }}>{lookupMsg}</p>}
          {lookupResult && <ZgloszenieCard z={lookupResult} />}
        </section>
      </div>
    </div>
  );
}

export default MojeZgloszenia;
