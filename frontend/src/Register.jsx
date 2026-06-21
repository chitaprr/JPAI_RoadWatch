import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./services/api";
import { saveAuth } from "./services/auth";
import Navbar from "./Navbar";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gminaId, setGminaId] = useState("");
  const [gminy, setGminy] = useState([]);
  const navigate = useNavigate();

  // Lista gmin do wyboru — endpoint publiczny (bez logowania).
  useEffect(() => {
    api
      .get("/gminy")
       
      .then((res) => setGminy(res.data.gminy ?? []))
      .catch(() => {});
  }, []);

  const handleRegister = async (event) => {
    event.preventDefault();

    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password,
        gminaId: Number(gminaId),
      });
      // Backend (CREATED) zagnieżdża payload pod `data`: { data: { token, user } }.
      const { token, user } = response.data.data;
      saveAuth(token, user);
      navigate("/");
    } catch (error) {
      const msg =
        error.response?.data?.msg ??
        "Nie udało się zarejestrować. Spróbuj ponownie.";
      alert(msg);
    }
  };

  return (
    <div>
      <Navbar />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "80px",
        }}
      >
        <h2>Rejestracja w RoadWatch</h2>

        <form
          onSubmit={handleRegister}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            width: "300px",
          }}
        >
          <input
            type="text"
            placeholder="Imię i nazwisko"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
          />
          <input
            type="email"
            placeholder="Twój adres e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Hasło (min. 6 znaków)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <select
            value={gminaId}
            onChange={(e) => setGminaId(e.target.value)}
            required
            style={{ padding: "8px" }}
          >
            <option value="">— Wybierz gminę —</option>
            {gminy.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button type="submit" style={{ padding: "10px", cursor: "pointer" }}>
            Zarejestruj się
          </button>
        </form>

        <p style={{ marginTop: "20px", fontSize: "14px" }}>
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
