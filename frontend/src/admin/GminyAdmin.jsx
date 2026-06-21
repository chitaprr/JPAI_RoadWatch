import { useEffect, useState } from "react";
import api from "../services/api";

const td = {
  padding: "8px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
};
const th = { ...td, textAlign: "left", fontWeight: "bold", background: "#f9fafb" };

// CRUD gmin (superadmin). Usuwanie blokowane przez backend (409), gdy gmina jest
// w użyciu (urzędnicy / wykonawcy / zgłoszenia).
function GminyAdmin() {
  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/gminy");
      setRows(res.data.gminy ?? []);
    } catch {
      setError("Nie udało się pobrać gmin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const errMsg = (e, fallback) => e.response?.data?.msg || fallback;

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/gminy", { name: newName });
      setNewName("");
      await load();
    } catch (e) {
      setError(errMsg(e, "Nie udało się dodać gminy."));
    }
  };

  const patchRow = (id, name) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));

  const save = async (row) => {
    setError("");
    try {
      await api.patch(`/gminy/${row.id}`, { name: row.name });
      await load();
    } catch (e) {
      setError(errMsg(e, `Nie udało się zapisać gminy #${row.id}.`));
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Usunąć gminę #${id}?`)) return;
    setError("");
    try {
      await api.delete(`/gminy/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(errMsg(e, `Nie udało się usunąć gminy #${id}.`));
    }
  };

  if (loading) return <p>Ładowanie…</p>;

  return (
    <div>
      {error && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>}

      <form onSubmit={add} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          placeholder="Nazwa nowej gminy"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          style={{ width: "240px" }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 14px",
            cursor: "pointer",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          Dodaj gminę
        </button>
      </form>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Nazwa</th>
            <th style={th}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>
                <input
                  value={r.name ?? ""}
                  onChange={(e) => patchRow(r.id, e.target.value)}
                  style={{ width: "240px" }}
                />
              </td>
              <td style={td}>
                <button onClick={() => save(r)} style={{ marginRight: "6px", cursor: "pointer" }}>
                  Zapisz
                </button>
                <button onClick={() => remove(r.id)} style={{ cursor: "pointer", color: "#b91c1c" }}>
                  Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GminyAdmin;
