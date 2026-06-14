import { BrowserRouter, Routes, Route } from "react-router-dom";
import Map from "./Map";
import Login from "./Login";
import ReportIssue from "./ReportIssue"; // Nasz widok z Tygodnia 5

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* NOWOŚĆ: Teraz główny, czysty adres prowadzi od razu do Logowania */}
        <Route path="/" element={<Login />} />

        {/* Mapa dostaje swój nowy, osobny adres: /mapa */}
        <Route path="/mapa" element={<Map />} />

        {/* Zgłoszenia usterek zostają bez zmian pod /zgloszenie */}
        <Route path="/zgloszenie" element={<ReportIssue />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
