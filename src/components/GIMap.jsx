import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Zap } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

// 🔥 PENTING: Import data koordinat GI
import { allGIs } from "../data/assetData";

// Fungsi membuat Icon Custom (Warna berubah sesuai status)
const createIcon = (status) => {
  let color = "#22c55e"; // Hijau (Normal)
  let glow = "rgba(34, 197, 94, 0.4)";

  if (status === "Waspada" || status === "Cond 2") {
    color = "#eab308"; // Kuning
    glow = "rgba(234, 179, 8, 0.4)";
  }
  if (status === "Kritis" || status === "Cond 3") {
    color = "#ef4444"; // Merah
    glow = "rgba(239, 68, 68, 0.4)";
  }

  const iconMarkup = renderToStaticMarkup(
    <div style={{ position: "relative", width: "32px", height: "32px" }}>
      {/* Efek Glow/Pulse */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: glow,
          borderRadius: "50%",
          animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        }}
      />
      {/* Icon Utama */}
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          border: `3px solid ${color}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          zIndex: 10,
        }}
      >
        <Zap size={16} color={color} fill={color} />
      </div>
    </div>,
  );

  return L.divIcon({
    html: iconMarkup,
    className: "custom-marker", // Pastikan CSS ini tidak conflict
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
};

const GIMap = ({ center = [0.8, 124.0], zoom = 8 }) => {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Layer Peta (OpenStreetMap) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔥 LOOPING DATA GI AGAR PIN MUNCUL */}
        {allGIs &&
          allGIs.map((gi, index) => {
            // Validasi koordinat (cegah error jika lat/lng kosong)
            if (!gi.lat || !gi.lng) return null;

            return (
              <Marker
                key={index}
                position={[gi.lat, gi.lng]}
                icon={createIcon("Normal")} // Default Normal, nanti bisa disambung ke liveData
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-bold text-sm text-gray-800">
                      {gi.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Koordinat: {gi.lat}, {gi.lng}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                      Status: Normal
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default GIMap;
