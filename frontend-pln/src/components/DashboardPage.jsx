import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"; // Import Standar React
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css"; // Wajib Import CSS Leaflet
import { ultgData, allGIs, trafoDatabase } from "../data/assetData";
import {
  Map as MapIcon,
  Zap,
  AlertTriangle,
  Server,
  Activity,
  Flame,
  Trophy,
} from "lucide-react";

// --- 1. SETUP IKON GI (SVG) ---
const createCustomIcon = (status) => {
  let color = "#22c55e";
  let glowClass = "";

  if (status === "Critical") {
    color = "#ef4444";
    glowClass = "blinking-marker";
  } else if (status === "Warning") {
    color = "#eab308";
  }

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" width="40" height="40" style="filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5));">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `;

  return divIcon({
    className: `custom-div-icon ${glowClass}`,
    html: svgIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35],
  });
};

const DashboardPage = ({ isDarkMode, liveData = [] }) => {
  // Stats Utama
  const totalStats = Object.values(ultgData).reduce(
    (acc, curr) => ({
      gi: acc.gi + curr.stats.gi,
      td: acc.td + curr.stats.td,
    }),
    { gi: 0, td: 0 }
  );

  // --- LOGIKA RANKING TRAFO ---
  const topTrafos = useMemo(() => {
    if (!Array.isArray(liveData) || liveData.length === 0) {
      return [];
    }
    return [...liveData]
      .map((item) => ({
        gi: item.lokasi_gi,
        unit: item.nama_trafo,
        tdcg: parseFloat(item.tdcg) || parseFloat(item.tdcg_value) || 0,
        status: item.ieee_status || "Normal",
      }))
      .sort((a, b) => b.tdcg - a.tdcg)
      .slice(0, 5);
  }, [liveData]);

  // --- LOGIKA STATUS PETA ---
  const getGIStatusFromLive = (giName) => {
    if (!Array.isArray(liveData) || liveData.length === 0) return "Normal";
    const giData = liveData.filter((d) => d.lokasi_gi === giName);
    if (giData.length === 0) return "Normal";
    const statuses = giData.map((d) => d.ieee_status || "");
    const isCritical = statuses.some(
      (s) =>
        s &&
        (s.toUpperCase().includes("CONDITION 4") ||
          s.toUpperCase().includes("KRITIS"))
    );
    const isWarning = statuses.some(
      (s) =>
        s &&
        (s.toUpperCase().includes("CONDITION 3") ||
          s.toUpperCase().includes("WASPADA"))
    );
    if (isCritical) return "Critical";
    if (isWarning) return "Warning";
    return "Normal";
  };

  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        @keyframes blink { 
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); } 
          50% { transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8)); } 
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); } 
        }
        .blinking-marker svg { animation: blink 1.5s infinite ease-in-out; }
        .leaflet-div-icon { background: transparent !important; border: none !important; }
        .leaflet-popup { z-index: 2000; } 
        .leaflet-popup-content-wrapper { border-radius: 12px; overflow: hidden; padding: 0; }
        .leaflet-popup-content { margin: 0; width: 340px !important; }
      `}</style>

      {/* HEADER STATS */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${textMain}`}>
          Dashboard Monitoring Aset
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div
            className={`p-6 rounded-xl border shadow-sm flex items-center gap-5 ${cardBg} border-l-4 border-l-blue-500`}
          >
            <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
              <MapIcon size={32} />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${textSub}`}
              >
                Total Gardu Induk
              </p>
              <p className={`text-4xl font-black ${textMain}`}>
                {totalStats.gi}
              </p>
            </div>
          </div>
          <div
            className={`p-6 rounded-xl border shadow-sm flex items-center gap-5 ${cardBg} border-l-4 border-l-yellow-500`}
          >
            <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-500">
              <Zap size={32} />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${textSub}`}
              >
                Total Trafo Daya
              </p>
              <p className={`text-4xl font-black ${textMain}`}>
                {totalStats.td}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- MAP SECTION --- */}
        <div
          className={`lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden h-[600px] relative z-0 ${cardBg}`}
        >
          {/* KEMBALI MENGGUNAKAN MapContainer BIASA */}
          <MapContainer
            center={[0.8, 124.0]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            {/* TileLayer DITAMBAHKAN KEMBALI */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={
                isDarkMode
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />

            {/* MARKERS */}
            {allGIs.map((gi, idx) => {
              const status = getGIStatusFromLive(gi.name);
              const trafoList = trafoDatabase[gi.name] || [];

              return (
                <Marker
                  key={idx}
                  position={[gi.lat, gi.lng]}
                  icon={createCustomIcon(status)}
                >
                  <Popup>
                    <div className="font-sans text-gray-800">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Server size={18} />
                          <h3 className="font-bold text-lg m-0 leading-none">
                            {gi.name}
                          </h3>
                        </div>
                        <p className="text-[10px] m-0 opacity-80 font-mono">
                          Lat: {gi.lat.toFixed(4)}, Lng: {gi.lng.toFixed(4)}
                        </p>
                      </div>

                      {status === "Critical" && (
                        <div className="bg-red-50 text-red-600 px-4 py-2 text-xs font-bold flex items-center gap-2 border-b border-red-100">
                          <AlertTriangle size={14} /> PERHATIAN: Masalah
                          Terdeteksi!
                        </div>
                      )}

                      <div className="bg-gray-50 max-h-[300px] overflow-y-auto p-3 space-y-3">
                        {trafoList.length > 0 ? (
                          trafoList.map((t, i) => {
                            let badgeColor = "bg-green-500";
                            if (t.op_status.includes("Tidak Operasi"))
                              badgeColor = "bg-red-500";
                            else if (t.op_status.includes("Standby"))
                              badgeColor = "bg-blue-500";
                            else if (t.op_status.includes("ATTB"))
                              badgeColor = "bg-yellow-500";
                            else if (t.op_status.includes("Belum"))
                              badgeColor = "bg-gray-500";

                            return (
                              <div
                                key={i}
                                className="p-3 rounded-lg border shadow-sm relative overflow-hidden bg-white border-gray-200"
                              >
                                <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1">
                                  <span className="font-bold text-blue-800 text-sm">
                                    {t.name}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${badgeColor}`}
                                  >
                                    {t.op_status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-gray-600">
                                  <div>
                                    Merk:{" "}
                                    <span className="font-semibold text-gray-900">
                                      {t.merk}
                                    </span>
                                  </div>
                                  <div>
                                    Thn:{" "}
                                    <span className="font-semibold text-gray-900">
                                      {t.year}
                                    </span>
                                  </div>
                                  <div className="col-span-2">
                                    S/N:{" "}
                                    <span className="font-mono font-semibold text-gray-900">
                                      {t.sn}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-4 text-gray-400 text-xs italic">
                            Data detail belum tersedia.
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* --- RANKING SECTION --- */}
        <div
          className={`rounded-2xl border shadow-sm p-6 flex flex-col ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/10">
            <h3 className={`font-bold flex items-center gap-2 ${textMain}`}>
              <Trophy className="text-yellow-500" size={20} /> Peringkat Trafo
            </h3>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded">
              Top 5 TDCG
            </span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {topTrafos.length > 0 ? (
              topTrafos.map((item, idx) => {
                let barColor = "bg-green-500";
                let textColor = "text-green-600";
                if (item.tdcg >= 720) {
                  barColor = "bg-red-500";
                  textColor = "text-red-600";
                } else if (item.tdcg >= 300) {
                  barColor = "bg-yellow-500";
                  textColor = "text-yellow-600";
                }

                return (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <p
                          className={`text-[10px] font-bold uppercase ${textSub}`}
                        >
                          {item.gi}
                        </p>
                        <p className={`text-sm font-bold ${textMain}`}>
                          {item.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-black ${textColor} flex items-center justify-end gap-1`}
                        >
                          <Flame size={14} /> {item.tdcg.toFixed(0)}{" "}
                          <span className="text-[10px] text-gray-400 font-normal">
                            ppm
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${barColor} transition-all duration-1000 ease-out`}
                        style={{
                          width: `${Math.min((item.tdcg / 2000) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                <Activity size={48} className="mb-2 text-gray-400" />
                <p className={`text-sm font-bold ${textMain}`}>
                  Belum Ada Data Gas
                </p>
                <p className={`text-xs ${textSub}`}>
                  Lakukan input data uji DGA untuk melihat peringkat kondisi
                  trafo.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
