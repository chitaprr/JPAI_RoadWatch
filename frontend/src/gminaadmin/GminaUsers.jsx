import { useEffect, useState } from "react";
import api from "../services/api";

// Administrator gminy nadaje role w obrębie swojej gminy. Roli ADMIN/superadmina
// nie może przyznać (pilnuje tego backend).
const ROLES = ["MIESZKANIEC", "URZEDNIK", "WYKONAWCA"];

const td = {
  padding: "8px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
};
const th = {
  ...td,
  textAlign: "left",
  fontWeight: "bold",
  background: "#f9fafb",
};

// Zarządzanie użytkownikami gminy: zmiana roli urzędnika/wykonawcy. Backend
// automatycznie przypina urzędnika do gminy administratora i waliduje wykonawcę.
function GminaUsers() {
  const [rows, setRows] = useState([]);
  const [wykonawcy, setWykonawcy] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [u, w] = await Promise.all([
        api.get("/users"),
        api.get("/wykonawcy"),
      ]);
      setRows(u.data.users ?? []);
      setWykonawcy(w.data.wykonawcy ?? []);
    } catch (e) {
      setError(
        e.response?.data?.msg ??
          "Nie udało się pobrać danych. Czy Twoje konto jest przypisane do gminy?",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pobranie danych przy montażu (legalny efekt) — celowo setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const errMsg = (e, fallback) => e.response?.data?.msg || fallback;

  // Wyszukanie konta po dokładnym adresie email, aby dodać je do listy gminy
  // (np. awansować mieszkańca na urzędnika).
  const lookup = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email) return;
    try {
      const res = await api.get("/users", { params: { email } });
      const found = res.data.users ?? [];
      if (found.length === 0) {
        setInfo("Nie znaleziono konta o tym adresie email.");
        return;
      }
      // Dołącz do listy, jeśli jeszcze go nie ma.
      setRows((prev) => {
        const exists = prev.some((r) => r.id === found[0].id);
        return exists ? prev : [...prev, found[0]];
      });
      setEmail("");
    } catch (e) {
      setError(errMsg(e, "Nie udało się wyszukać użytkownika."));
    }
  };

  const patchRow = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const save = async (row) => {
    setError("");
    setInfo("");
    try {
      await api.patch(`/users/${row.id}`, {
        name: row.name,
        role: row.role,
        wykonawcaId: row.role === "WYKONAWCA" ? (row.wykonawcaId ?? null) : null,
      });
      await load();
      setInfo(`Zapisano użytkownika #${row.id}.`);
    } catch (e) {
      setError(errMsg(e, `Nie udało się zapisać użytkownika #${row.id}.`));
    }
  };

  const numOrNull = (v) => (v === "" ? null : Number(v));

  if (loading) return <p>Ładowanie…</p>;

  return (
    <div>
      {error && (
        <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>
      )}
      {info && <p style={{ color: "#15803d", marginBottom: "12px" }}>{info}</p>}

      <form
        onSubmit={lookup}
        style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
      >
        <input
          type="email"
          placeholder="Znajdź konto po email (np. aby awansować mieszkańca)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "360px" }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 14px",
            cursor: "pointer",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          Szukaj
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Email</th>
              <th style={th}>Imię</th>
              <th style={th}>Rola</th>
              <th style={th}>Wykonawca (firma)</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.id}</td>
                <td style={td}>{r.email}</td>
                <td style={td}>{r.name}</td>
                <td style={td}>
                  <select
                    value={r.role}
                    onChange={(e) => patchRow(r.id, "role", e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <select
                    value={r.wykonawcaId ?? ""}
                    disabled={r.role !== "WYKONAWCA"}
                    onChange={(e) =>
                      patchRow(r.id, "wykonawcaId", numOrNull(e.target.value))
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
                  <button onClick={() => save(r)} style={{ cursor: "pointer" }}>
                    Zapisz
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td style={td} colSpan={6}>
                  Brak użytkowników w Twojej gminie. Wyszukaj konto po email, aby
                  nadać mu rolę.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GminaUsers;
