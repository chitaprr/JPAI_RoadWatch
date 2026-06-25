import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isLoggedIn, getUser, logout } from "./services/auth";
import { subscribeToPush } from "./services/push";
import "./Navbar.css";

// Górny pasek nawigacji. Treść przycisków zależy od stanu zalogowania.
function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    // Twardy reload, żeby cały interfejs odświeżył stan logowania.
    window.location.href = "/";
  };

  const handleEnablePush = async () => {
    const res = await subscribeToPush();
    alert(res.msg);
  };

  const navBtn = (bg) => ({
    padding: "8px 16px",
    cursor: "pointer",
    backgroundColor: bg,
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontWeight: "bold",
    fontSize: "14px",
  });

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        padding: "12px 20px",
        backgroundColor: "#1f2937",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        zIndex: 1100,
      }}
    >
      <span
        onClick={() => go("/")}
        style={{
          color: "white",
          fontWeight: "bold",
          fontSize: "20px",
          cursor: "pointer",
          letterSpacing: "0.5px",
        }}
      >
        🛣️ RoadWatch
      </span>

      <button
        className="navbar-hamburger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menu"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <nav className={`navbar-nav${menuOpen ? " open" : ""}`}>
        {location.pathname !== "/zgloszenie" && (
          <button onClick={() => go("/zgloszenie")} style={navBtn("#dc3545")}>
            + Zgłoś usterkę
          </button>
        )}

        {location.pathname !== "/moje-zgloszenia" && (
          <button
            onClick={() => go("/moje-zgloszenia")}
            style={navBtn("#0d9488")}
          >
            Moje zgłoszenia
          </button>
        )}

        {loggedIn ? (
          <>
            {user?.isSuperadmin && location.pathname !== "/admin" && (
              <button onClick={() => go("/admin")} style={navBtn("#7c3aed")}>
                Panel Admina
              </button>
            )}
            {user?.role === "ADMIN" && location.pathname !== "/gmina" && (
              <button onClick={() => go("/gmina")} style={navBtn("#0d9488")}>
                Panel gminy
              </button>
            )}
            {(user?.role === "URZEDNIK" || user?.isSuperadmin) &&
              location.pathname !== "/urzednik" && (
                <button
                  onClick={() => go("/urzednik")}
                  style={navBtn("#0891b2")}
                >
                  Panel urzędnika
                </button>
              )}
            {(user?.role === "WYKONAWCA" || user?.isSuperadmin) &&
              location.pathname !== "/wykonawca" && (
                <button
                  onClick={() => go("/wykonawca")}
                  style={navBtn("#ea580c")}
                >
                  Panel wykonawcy
                </button>
              )}
            <button
              onClick={handleEnablePush}
              style={navBtn("#475569")}
              title="Włącz powiadomienia push"
            >
              🔔
            </button>
            <span style={{ color: "#cbd5e1", fontSize: "14px" }}>
              {user?.email ?? "Zalogowano"}
            </span>
            <button onClick={handleLogout} style={navBtn("#6b7280")}>
              Wyloguj się
            </button>
          </>
        ) : (
          <>
            <button onClick={() => go("/login")} style={navBtn("#2563eb")}>
              Zaloguj się
            </button>
            <button onClick={() => go("/register")} style={navBtn("#059669")}>
              Zarejestruj się
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
