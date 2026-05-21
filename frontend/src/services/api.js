import axios from 'axios';

// Tworzymy instancję Axiosa z podstawową konfiguracją URL do backendu
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR ŻĄDAŃ: Automatycznie dodaje token JWT do każdego zapytania, jeśli istnieje
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// INTERCEPTOR ODPOWIEDZI: Globalne przechwytywanie błędów (np. 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Jeśli token wygasł lub jest niepoprawny - czyścimy dane i możemy przekierować na logowanie
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;