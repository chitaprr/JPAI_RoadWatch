import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; 

function App() {
  return (
    // To jest główne pudełko. Dajemy mu 100vh, czyli 100% wysokości ekranu
    <div style={{ height: "100vh", width: "100vw" }}>
      
      {/* Tu zaczyna się nasza mapa! Ustawiamy środek na Kraków */}
      <MapContainer center={[50.0647, 19.9450]} zoom={13} style={{ height: "100%", width: "100%" }}>
        
        {/* To jest warstwa, która pobiera obrazki (kafelki) mapy z internetu */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* A to jest pinezka wbita w mapę! */}
        <Marker position={[50.0647, 19.9450]}>
          <Popup>
            JPAI RoadWatch - Nasza pierwsza pinezka!
          </Popup>
        </Marker>

      </MapContainer>
    </div>
  );
}

export default App;