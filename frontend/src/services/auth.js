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

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
