import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Zap } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

// Fungsi membuat Icon Custom (Warna berubah sesuai status)
const createIcon = (status) => {
  let color = "#22c55e"; // Hijau (Normal)
  if (status === "Waspada") color = "#eab308"; // Kuning
  if (status === "Kritis") color = "#ef4444"; // Merah

  const iconMarkup = renderToStaticMarkup(
    <div
      style={{
        backgroundColor: "white",
        border: `3px solid ${color}`,
        borderRadius: "50%",
        padding: "5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
      }}
    >
      <Zap size={16} color={color} fill={color} />
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default GIMap;
