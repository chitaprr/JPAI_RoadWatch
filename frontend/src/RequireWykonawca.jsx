import { Navigate } from "react-router-dom";
import { getToken, getUser } from "./services/auth";

// Strażnik panelu wykonawcy. Wpuszcza rolę WYKONAWCA oraz superadmina.
// Właściwą autoryzację i scoping po firmie wymusza backend.
function RequireWykonawca({ children }) {
  const user = getUser();
  const allowed = user?.isSuperadmin || user?.role === "WYKONAWCA";
  if (!getToken() || !allowed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default RequireWykonawca;
