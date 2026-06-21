import { useEffect, useState } from "react";
import api from "../services/api";

const ROLES = ["MIESZKANIEC", "URZEDNIK", "WYKONAWCA", "ADMIN"];

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

// Zarządzanie użytkownikami (superadmin): zmiana roli, gminy urzędnika,
// powiązania z wykonawcą, flagi superadmina + usuwanie.
function UsersAdmin() {
  const [rows, setRows] = useState([]);
  const [gminy, setGminy] = useState([]);
  const [wykonawcy, setWykonawcy] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [u, g, w] = await Promise.all([
        api.get("/users"),
        api.get("/gminy"),
        api.get("/wykonawcy"),
      ]);
      setRows(u.data.users ?? []);
      setGminy(g.data.gminy ?? []);
      setWykonawcy(w.data.wykonawcy ?? []);
    } catch {
      setError("Nie udało się pobrać danych. Czy jesteś superadminem?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pobranie danych przy montażu (legalny efekt) — celowo setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  // Lokalna edycja wiersza (przed zapisem).
  const patchRow = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const save = async (row) => {
    setError("");
    try {
      await api.patch(`/users/${row.id}`, {
        name: row.name,
        role: row.role,
        isSuperadmin: row.isSuperadmin,
        urzednikGminaId: row.urzednikGminaId ?? null,
        adminGminaId: row.adminGminaId ?? null,
        wykonawcaId: row.wykonawcaId ?? null,
      });
      await load();
    } catch {
      setError(`Nie udało się zapisać użytkownika #${row.id}.`);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Usunąć użytkownika #${id}?`)) return;
    setError("");
    try {
      await api.delete(`/users/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError(`Nie udało się usunąć użytkownika #${id}.`);
    }
  };

  // Select gminy/wykonawcy: pusty string -> null.
  const numOrNull = (v) => (v === "" ? null : Number(v));

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
              <th style={th}>Email</th>
              <th style={th}>Imię</th>
              <th style={th}>Rola</th>
              <th style={th}>Gmina (urzędnik)</th>
              <th style={th}>Gmina (admin)</th>
              <th style={th}>Wykonawca</th>
              <th style={th}>Superadmin</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.id}</td>
                <td style={td}>{r.email}</td>
                <td style={td}>
                  <input
                    value={r.name ?? ""}
                    onChange={(e) => patchRow(r.id, "name", e.target.value)}
                    style={{ width: "120px" }}
                  />
                </td>
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
                    value={r.urzednikGminaId ?? ""}
                    onChange={(e) =>
                      patchRow(
                        r.id,
                        "urzednikGminaId",
                        numOrNull(e.target.value),
                      )
                    }
                  >
                    <option value="">—</option>
                    {gminy.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <select
                    value={r.adminGminaId ?? ""}
                    onChange={(e) =>
                      patchRow(r.id, "adminGminaId", numOrNull(e.target.value))
                    }
                  >
                    <option value="">—</option>
                    {gminy.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <select
                    value={r.wykonawcaId ?? ""}
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
                  <input
                    type="checkbox"
                    checked={!!r.isSuperadmin}
                    onChange={(e) =>
                      patchRow(r.id, "isSuperadmin", e.target.checked)
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

export default UsersAdmin;
