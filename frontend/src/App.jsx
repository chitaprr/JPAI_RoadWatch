import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import api from "./services/api";
import { getToken, setUser } from "./services/auth";
import { ensurePushSubscribed } from "./services/push";
import Map from "./Map";
import Login from "./Login";
import Register from "./Register";
import ReportIssue from "./ReportIssue";
import MojeZgloszenia from "./MojeZgloszenia";
import RequireSuperadmin from "./RequireSuperadmin";
import AdminLayout from "./admin/AdminLayout";
import RequireUrzednik from "./RequireUrzednik";
import UrzednikPanel from "./urzednik/UrzednikPanel";
import RequireWykonawca from "./RequireWykonawca";
import WykonawcaPanel from "./wykonawca/WykonawcaPanel";
import RequireAdmin from "./RequireAdmin";
import GminaAdminLayout from "./gminaadmin/GminaAdminLayout";

function App() {
  // Odświeżenie danych zalogowanego użytkownika z bazy — rola/gmina mogły się
  // zmienić po wydaniu tokena. Bump stanu wymusza re-render (Navbar/strażnicy
  // czytają getUser() na nowo). Błąd (np. 403) obsłuży interceptor w api.js.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!getToken()) return;
    api
      .get("/users/me")
      .then((res) => {
        setUser(res.data.user);
        setTick((t) => t + 1);
      })
      .catch(() => {});
    // Utrzymanie subskrypcji push, jeśli użytkownik wcześniej zezwolił.
    ensurePushSubscribed();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Strona główna: publiczna mapa z usterkami */}
        <Route path="/" element={<Map />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/zgloszenie" element={<ReportIssue />} />
        <Route path="/moje-zgloszenia" element={<MojeZgloszenia />} />
        {/* Panel admina — dostęp tylko dla superadmina */}
        <Route
          path="/admin"
          element={
            <RequireSuperadmin>
              <AdminLayout />
            </RequireSuperadmin>
          }
        />
        {/* Panel administratora gminy — rola ADMIN (lub superadmin) */}
        <Route
          path="/gmina"
          element={
            <RequireAdmin>
              <GminaAdminLayout />
            </RequireAdmin>
          }
        />
        {/* Panel urzędnika — rola URZEDNIK (lub superadmin) */}
        <Route
          path="/urzednik"
          element={
            <RequireUrzednik>
              <UrzednikPanel />
            </RequireUrzednik>
          }
        />
        {/* Panel wykonawcy — rola WYKONAWCA (lub superadmin) */}
        <Route
          path="/wykonawca"
          element={
            <RequireWykonawca>
              <WykonawcaPanel />
            </RequireWykonawca>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
