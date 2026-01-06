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

const GIMap = ({ giList }) => {
  // Pusat Peta (Kira-kira tengah Sulawesi Utara/Gorontalo)
  const mapCenter = [1.0, 124.0];

  return (
    <MapContainer
      center={mapCenter}
      zoom={8}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; PLN UPT Manado"
      />
      {giList.map((gi, idx) => (
        <Marker
          key={idx}
          position={[gi.lat, gi.lng]}
          icon={createIcon(gi.status)}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-[#1B7A8F]">{gi.name}</h3>
              <p className="text-xs text-gray-500 font-semibold mb-2">
                {gi.voltage}
              </p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-white ${
                      gi.status === "Normal"
                        ? "bg-green-500"
                        : gi.status === "Waspada"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  >
                    {gi.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Koordinat:</span>
                  <span>
                    {gi.lat}, {gi.lng}
                  </span>
                </div>
                <button className="mt-2 w-full bg-[#1B7A8F] text-white py-1 rounded text-xs hover:bg-[#156070]">
                  Lihat Detail DGA
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default GIMap;
