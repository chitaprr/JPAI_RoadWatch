// Prosty stan logowania trzymany w localStorage. Token wstrzykuje interceptor
// w services/api.js; tutaj trzymamy też dane użytkownika do wyświetlenia w UI.

export const getToken = () => localStorage.getItem("token");

export const isLoggedIn = () => !!localStorage.getItem("token");

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export const saveAuth = (token, user) => {
  localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
};

// Aktualizacja samych danych użytkownika (bez zmiany tokena) — np. po
// odświeżeniu z GET /users/me, gdy rola/gmina mogły się zmienić w bazie.
export const setUser = (user) => {
  if (user) localStorage.setItem("user", JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
