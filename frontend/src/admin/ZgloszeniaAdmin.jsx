import { useEffect, useState } from "react";
import api from "../services/api";

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

// Zarządzanie zgłoszeniami (superadmin widzi wszystkie gminy): triaż + usuwanie.
function ZgloszeniaAdmin() {
  const [rows, setRows] = useState([]);
  const [urzednicy, setUrzednicy] = useState([]);
  const [wykonawcy, setWykonawcy] = useState([]);
  const [gminy, setGminy] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [z, u, w, g] = await Promise.all([
        api.get("/zgloszenia"),
        api.get("/users"),
        api.get("/wykonawcy"),
        api.get("/gminy"),
      ]);
      setRows(z.data.zgloszenia ?? []);
      setUrzednicy((u.data.users ?? []).filter((x) => x.role === "URZEDNIK"));
      setWykonawcy(w.data.wykonawcy ?? []);
      setGminy(g.data.gminy ?? []);
    } catch {
      setError("Nie udało się pobrać zgłoszeń.");
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
  const gminaName = (id) => gminy.find((g) => g.id === id)?.name ?? "—";

  const save = async (row) => {
    setError("");
    try {
      await api.patch(`/zgloszenia/${row.id}`, {
        status: row.status,
        priority: Number(row.priority),
        urzednikId: row.urzednikId ?? null,
        contractorId: row.contractorId ?? null,
        // backend oczekuje pełnego ISO lub null
        deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
      });
      await load();
    } catch {
      setError(`Nie udało się zapisać zgłoszenia #${row.id}.`);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Usunąć zgłoszenie #${id}?`)) return;
    setError("");
    try {
      await api.delete(`/zgloszenia/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError(`Nie udało się usunąć zgłoszenia #${id}.`);
    }
  };

  // Lista statusów z gwarancją obecności bieżącej wartości.
  const statusOptions = (current) =>
    STATUSY.includes(current) ? STATUSY : [current, ...STATUSY];

  if (loading) return <p>Ładowanie…</p>;

  return (
    <div>
      {error && (
        <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Tytuł</th>
              <th style={th}>Gmina</th>
              <th style={th}>Status</th>
              <th style={th}>Priorytet</th>
              <th style={th}>Urzędnik</th>
              <th style={th}>Wykonawca</th>
              <th style={th}>Termin</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.id}</td>
                <td style={td} title={r.description}>
                  {r.title}
                </td>
                <td style={td}>{gminaName(r.gminaId)}</td>
                <td style={td}>
                  <select
                    value={r.status}
                    onChange={(e) => patchRow(r.id, "status", e.target.value)}
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
                    value={r.urzednikId ?? ""}
                    onChange={(e) =>
                      patchRow(r.id, "urzednikId", numOrNull(e.target.value))
                    }
                  >
                    <option value="">—</option>
                    {urzednicy.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <select
                    value={r.contractorId ?? ""}
                    onChange={(e) =>
                      patchRow(r.id, "contractorId", numOrNull(e.target.value))
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
                  <button
                    onClick={() => save(r)}
                    style={{ marginRight: "6px", cursor: "pointer" }}
                  >
                    Zapisz
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    style={{ cursor: "pointer", color: "#b91c1c" }}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ZgloszeniaAdmin;
