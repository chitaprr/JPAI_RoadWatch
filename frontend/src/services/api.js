import axios from "axios";

// Tworzymy instancję Axiosa z podstawową konfiguracją URL do backendu
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/",
  headers: {
    "Content-Type": "application/json",
  },
});

// INTERCEPTOR ŻĄDAŃ: Automatycznie dodaje token JWT do każdego zapytania, jeśli istnieje.
// Żądania z `skipAuth: true` celowo lecą bez tokena (np. zgłoszenie jako gość) —
// inaczej resztkowy/wygasły token z localStorage byłby odrzucony przez backend (403).
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && !config.skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// INTERCEPTOR ODPOWIEDZI: Globalne przechwytywanie błędów (np. 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      console.log("remove token");
      // Jeśli token wygasł lub jest niepoprawny - czyścimy dane i możemy przekierować na logowanie
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default api;
