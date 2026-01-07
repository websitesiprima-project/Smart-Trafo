import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import {
  ultgData,
  allGIs,
  trafoDatabase, // Gunakan database lengkap yang baru
  getGIHealthStatus,
  historicalDGA,
} from "../data/assetdata";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Map as MapIcon,
  Zap,
  AlertTriangle,
  Server,
  Info,
  Activity,
  AlertCircle,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// --- 1. LOGIKA CUSTOM ICON (BLINKING) ---
const createCustomIcon = (status) => {
  let iconUrl =
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-green.png";
  let className = "";

  if (status === "Critical") {
    iconUrl =
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-red.png";
    className = "blinking-marker";
  } else if (status === "Warning") {
    iconUrl =
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-gold.png";
  }

  return new Icon({
    iconUrl,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: className,
  });
};

const DashboardPage = ({ isDarkMode }) => {
  // --- STATE ---
  const [selectedGI, setSelectedGI] = useState(allGIs[0]?.name || "");
  const [selectedTrafo, setSelectedTrafo] = useState("");
  const [chartData, setChartData] = useState([]);

  // --- HITUNG STATISTIK TOTAL (Hanya GI & Trafo) ---
  const totalStats = Object.values(ultgData).reduce(
    (acc, curr) => ({
      gi: acc.gi + curr.stats.gi,
      td: acc.td + curr.stats.td,
    }),
    { gi: 0, td: 0 }
  );

  // --- EFEK 1: AUTO SELECT TRAFO (FIX CRASH) ---
  useEffect(() => {
    if (selectedGI && trafoDatabase[selectedGI]) {
      // PERBAIKAN: Ambil .name dari object trafo pertama
      // Jangan set object utuh ke state string
      const firstTrafo = trafoDatabase[selectedGI][0];
      setSelectedTrafo(firstTrafo ? firstTrafo.name : "");
    } else {
      setSelectedTrafo("");
    }
  }, [selectedGI]);

  // --- EFEK 2: UPDATE CHART DATA ---
  useEffect(() => {
    if (selectedGI && selectedTrafo) {
      const key = `${selectedGI} - ${selectedTrafo}`;
      const data = historicalDGA[key] || [];
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [selectedGI, selectedTrafo]);

  // --- STYLE HELPER ---
  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";

  return (
    <div className="space-y-6 pb-20">
      {/* CSS Animasi Kedip */}
      <style>{`
        @keyframes blink { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
        .blinking-marker { animation: blink 1.2s infinite ease-in-out; filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.7)); }
        .leaflet-popup-content-wrapper { border-radius: 12px; overflow: hidden; padding: 0; }
        .leaflet-popup-content { margin: 0; width: 340px !important; }
      `}</style>

      {/* HEADER & STATS */}
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
        {/* --- KOLOM KIRI: PETA (2/3 Lebar) --- */}
        <div
          className={`lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden h-[600px] relative z-0 ${cardBg}`}
        >
          <MapContainer
            center={[0.8, 124.0]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url={
                isDarkMode
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />
            {allGIs.map((gi, idx) => {
              const status = getGIHealthStatus(gi.name);
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
                          trafoList.map((t, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border shadow-sm relative overflow-hidden bg-white ${
                                t.status === "Kritis"
                                  ? "border-red-300"
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1">
                                <span className="font-bold text-blue-800 text-sm">
                                  {t.name}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${
                                    t.status === "Kritis"
                                      ? "bg-red-500"
                                      : t.status === "Waspada"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                >
                                  {t.status}
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
                          ))
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

        {/* --- KOLOM KANAN: GRAFIK & FILTER (1/3 Lebar) --- */}
        <div
          className={`rounded-2xl border shadow-sm p-6 flex flex-col ${cardBg}`}
        >
          <h3 className={`font-bold mb-4 flex items-center gap-2 ${textMain}`}>
            <Activity className="text-blue-500" /> Analisis Cepat
          </h3>

          {/* Filter Controls */}
          <div className="space-y-4 mb-6">
            <div>
              <label
                className={`text-[10px] uppercase font-bold mb-1 block ${textSub}`}
              >
                Pilih Gardu Induk
              </label>
              <select
                value={selectedGI}
                onChange={(e) => setSelectedGI(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                {allGIs.map((gi, idx) => (
                  <option key={idx} value={gi.name}>
                    {gi.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`text-[10px] uppercase font-bold mb-1 block ${textSub}`}
              >
                Pilih Unit Trafo
              </label>
              <select
                value={selectedTrafo}
                onChange={(e) => setSelectedTrafo(e.target.value)}
                disabled={!selectedGI}
                className={`w-full p-2.5 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                {selectedGI && trafoDatabase[selectedGI] ? (
                  trafoDatabase[selectedGI].map((t, idx) => (
                    // PERBAIKAN UTAMA: Gunakan t.name (String), bukan t (Object)
                    <option key={idx} value={t.name}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <option>Data Kosong</option>
                )}
              </select>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="flex-1 min-h-[250px] relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDarkMode ? "#334155" : "#e2e8f0"}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                    tickFormatter={(v) => v.split("-")[0]}
                    fontSize={10}
                  />
                  <YAxis
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1e293b" : "#fff",
                      borderRadius: "8px",
                      border: "none",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="H2"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="CH4"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="C2H2"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="TDCG"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                <AlertCircle size={40} className="mb-2 text-gray-400" />
                <p className={`text-sm font-bold ${textMain}`}>
                  Tidak Ada Data
                </p>
                <p className={`text-xs ${textSub}`}>
                  Pilih trafo lain untuk melihat grafik.
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
