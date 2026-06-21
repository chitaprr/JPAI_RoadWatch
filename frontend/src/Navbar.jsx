import { useNavigate, useLocation } from "react-router-dom";
import { isLoggedIn, getUser, logout } from "./services/auth";

// Górny pasek nawigacji. Treść przycisków zależy od stanu zalogowania.
function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const user = getUser();

  const handleLogout = () => {
    logout();
    // Twardy reload, żeby cały interfejs odświeżył stan logowania.
    window.location.href = "/";
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
        gap: "12px",
        padding: "12px 20px",
        backgroundColor: "#1f2937",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        zIndex: 1100,
      }}
    >
      <span
        onClick={() => navigate("/")}
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

      <nav style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {location.pathname !== "/zgloszenie" && (
          <button
            onClick={() => navigate("/zgloszenie")}
            style={navBtn("#dc3545")}
          >
            + Zgłoś usterkę
          </button>
        )}

        {location.pathname !== "/moje-zgloszenia" && (
          <button
            onClick={() => navigate("/moje-zgloszenia")}
            style={navBtn("#0d9488")}
          >
            Moje zgłoszenia
          </button>
        )}

        {loggedIn ? (
          <>
            {user?.isSuperadmin && location.pathname !== "/admin" && (
              <button
                onClick={() => navigate("/admin")}
                style={navBtn("#7c3aed")}
              >
                Panel
              </button>
            )}
            {(user?.role === "URZEDNIK" || user?.isSuperadmin) &&
              location.pathname !== "/urzednik" && (
                <button
                  onClick={() => navigate("/urzednik")}
                  style={navBtn("#0891b2")}
                >
                  Panel urzędnika
                </button>
              )}
            {(user?.role === "WYKONAWCA" || user?.isSuperadmin) &&
              location.pathname !== "/wykonawca" && (
                <button
                  onClick={() => navigate("/wykonawca")}
                  style={navBtn("#ea580c")}
                >
                  Panel wykonawcy
                </button>
              )}
            <span style={{ color: "#cbd5e1", fontSize: "14px" }}>
              {user?.email ?? "Zalogowano"}
            </span>
            <button onClick={handleLogout} style={navBtn("#6b7280")}>
              Wyloguj się
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/login")}
              style={navBtn("#2563eb")}
            >
              Zaloguj się
            </button>
            <button
              onClick={() => navigate("/register")}
              style={navBtn("#059669")}
            >
              Zarejestruj się
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
