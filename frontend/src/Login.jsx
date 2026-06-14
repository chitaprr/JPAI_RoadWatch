import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/api"; // Nasz kelner do kontaktów z backendem!

function Login() {
  // 1. Pamięć podręczna na to, co wpisujesz
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2. Narzędzie do zmieniania stron
  const navigate = useNavigate();

  // 3. Co ma się stać po kliknięciu "Zaloguj"
  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await api.post("/auth/login", { email, password });
      // Backend zwraca kopertę { success, msg, token, user } (token na top-level).
      localStorage.setItem("token", response.data.token);
      navigate("/mapa");
    } catch {
      alert("Błędny email lub hasło. Spróbuj ponownie!");
    }
  };

  // 4. To, co widać na ekranie (Wygląd)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "100px",
      }}
    >
      <h2>Logowanie do RoadWatch</h2>

      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "300px",
        }}
      >
        <input
          type="email"
          placeholder="Twój adres e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)} // Zapisuj literka po literce to, co piszę
          required
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)} // Zapisuj literka po literce
          required
        />
        <button type="submit" style={{ padding: "10px", cursor: "pointer" }}>
          Zaloguj się
        </button>
      </form>
      {/* Przycisk do zgłaszania usterki dla niezalogowanych */}
      <button
        onClick={() => navigate("/zgloszenie")}
        style={{
          marginTop: "20px",
          padding: "10px",
          cursor: "pointer",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Zgłoś usterkę bez logowania
      </button>
    </div>
  );
}

export default Login;
