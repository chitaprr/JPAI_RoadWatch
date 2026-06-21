import { Navigate } from "react-router-dom";
import { getToken, getUser } from "./services/auth";

// Strażnik panelu administratora gminy. Dostęp dla roli ADMIN oraz superadmina
// (który może wszystko). Autoryzację i tak wymusza backend — to warstwa UI.
function RequireAdmin({ children }) {
  const user = getUser();
  const allowed = user?.role === "ADMIN" || user?.isSuperadmin;
  if (!getToken() || !allowed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default RequireAdmin;
