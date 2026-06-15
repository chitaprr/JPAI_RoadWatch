import { Navigate } from "react-router-dom";
import { getToken, getUser } from "./services/auth";

// Strażnik panelu urzędnika. Wpuszcza rolę URZEDNIK oraz superadmina
// (może wszystko). Autoryzację i scoping gminy wymusza backend.
function RequireUrzednik({ children }) {
  const user = getUser();
  const allowed = user?.isSuperadmin || user?.role === "URZEDNIK";
  if (!getToken() || !allowed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default RequireUrzednik;
