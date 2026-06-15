import { Navigate } from "react-router-dom";
import { getToken, getUser } from "./services/auth";

// Strażnik tras panelu. Brak tokena lub konto bez isSuperadmin -> przekierowanie
// na logowanie. Autoryzację i tak wymusza backend; to jest tylko warstwa UI.
function RequireSuperadmin({ children }) {
  const user = getUser();
  if (!getToken() || !user?.isSuperadmin) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default RequireSuperadmin;
