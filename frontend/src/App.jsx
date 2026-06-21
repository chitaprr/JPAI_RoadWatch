import { BrowserRouter, Routes, Route } from "react-router-dom";
import Map from "./Map";
import Login from "./Login";
import Register from "./Register";
import ReportIssue from "./ReportIssue";
import IssueList from './IssueList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Strona główna: publiczna mapa z usterkami */}
        <Route path="/" element={<Map />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/zgloszenie" element={<ReportIssue />} />
        <Route path="/lista" element={<IssueList />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
