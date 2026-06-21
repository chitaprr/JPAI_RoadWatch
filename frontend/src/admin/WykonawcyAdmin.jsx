import { useEffect, useState } from "react";
import api from "../services/api";

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

const EMPTY = { name: "", nip: "", gminaId: "" };

// CRUD wykonawców (superadmin). Każdy wykonawca przypisany do gminy.
function WykonawcyAdmin() {
  const [rows, setRows] = useState([]);
  const [gminy, setGminy] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [w, g] = await Promise.all([
        api.get("/wykonawcy"),
        api.get("/gminy"),
      ]);
      setRows(w.data.wykonawcy ?? []);
      setGminy(g.data.gminy ?? []);
    } catch {
      setError("Nie udało się pobrać wykonawców.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const errMsg = (e, fallback) => e.response?.data?.msg || fallback;
  const gminaName = (id) => gminy.find((g) => g.id === id)?.name ?? "—";

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/wykonawcy", {
        name: form.name,
        nip: form.nip,
        gminaId: Number(form.gminaId),
      });
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(errMsg(e, "Nie udało się dodać wykonawcy."));
    }
  };

  const patchRow = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const save = async (row) => {
    setError("");
    try {
      await api.patch(`/wykonawcy/${row.id}`, {
        name: row.name,
        nip: row.nip,
        gminaId: Number(row.gminaId),
      });
      await load();
    } catch (e) {
      setError(errMsg(e, `Nie udało się zapisać wykonawcy #${row.id}.`));
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Usunąć wykonawcę #${id}?`)) return;
    setError("");
    try {
      await api.delete(`/wykonawcy/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(errMsg(e, `Nie udało się usunąć wykonawcy #${id}.`));
    }
  };

  if (loading) return <p>Ładowanie…</p>;

  return (
    <div>
      {error && (
        <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>
      )}

      <form
        onSubmit={add}
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Nazwa firmy"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          style={{ width: "200px" }}
        />
        <input
          placeholder="NIP"
          value={form.nip}
          onChange={(e) => setForm({ ...form, nip: e.target.value })}
          required
          style={{ width: "140px" }}
        />
        <select
          value={form.gminaId}
          onChange={(e) => setForm({ ...form, gminaId: e.target.value })}
          required
        >
          <option value="">— Gmina —</option>
          {gminy.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
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
          Dodaj wykonawcę
        </button>
      </form>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Nazwa</th>
            <th style={th}>NIP</th>
            <th style={th}>Gmina</th>
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
                  onChange={(e) => patchRow(r.id, "name", e.target.value)}
                  style={{ width: "180px" }}
                />
              </td>
              <td style={td}>
                <input
                  value={r.nip ?? ""}
                  onChange={(e) => patchRow(r.id, "nip", e.target.value)}
                  style={{ width: "130px" }}
                />
              </td>
              <td style={td}>
                <select
                  value={r.gminaId ?? ""}
                  onChange={(e) => patchRow(r.id, "gminaId", e.target.value)}
                  title={gminaName(r.gminaId)}
                >
                  {gminy.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
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
  );
}

export default WykonawcyAdmin;
