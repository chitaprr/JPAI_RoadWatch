import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; 

function Map() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer center={[50.0647, 19.9450]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[50.0647, 19.9450]}>
          <Popup>JPAI RoadWatch - Nasza pierwsza pinezka!</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default Map;