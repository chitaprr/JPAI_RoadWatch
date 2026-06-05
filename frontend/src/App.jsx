import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Map from './Map';
import Login from './Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Teraz czysty adres to Logowanie */}
        <Route path="/" element={<Login />} />
        
        {/* A adres z dopiskiem /mapa prowadzi do Mapy */}
        <Route path="/mapa" element={<Map />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;