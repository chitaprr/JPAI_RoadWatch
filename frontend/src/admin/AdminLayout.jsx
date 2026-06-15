import { useState } from "react";
import Navbar from "../Navbar";
import UsersAdmin from "./UsersAdmin";
import ZgloszeniaAdmin from "./ZgloszeniaAdmin";

const TABS = [
  { key: "users", label: "Użytkownicy" },
  { key: "zgloszenia", label: "Zgłoszenia" },
];

// Panel superadmina: zakładki przełączane lokalnym stanem (bez osobnych tras).
function AdminLayout() {
  const [tab, setTab] = useState("users");

  const tabBtn = (active) => ({
    padding: "10px 18px",
    cursor: "pointer",
    border: "none",
    borderBottom: active ? "3px solid #2563eb" : "3px solid transparent",
    background: "transparent",
    color: active ? "#2563eb" : "#374151",
    fontWeight: "bold",
    fontSize: "15px",
  });

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
          Panel administratora
        </h1>

        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "20px",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={tabBtn(tab === t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users" ? <UsersAdmin /> : <ZgloszeniaAdmin />}
      </div>
    </div>
  );
}

export default AdminLayout;
