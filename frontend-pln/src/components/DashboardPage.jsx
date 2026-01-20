import React, { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ultgData, allGIs, trafoDatabase } from "../data/assetData";
import {
  Map as MapIcon,
  Zap,
  AlertTriangle,
  Server,
  Activity,
  Flame,
  Trophy,
  X,
  TrendingUp,
  FileBarChart,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// --- 1. SETUP IKON ---
const createCustomIcon = (status) => {
  let iconUrl = "/markers/pin-normal.png";
  const s = (status || "").toString().toUpperCase();

  // PRIORITAS 1: MERAH (Kondisi 3, 4, Kritis)
  if (
    s.includes("COND 3") ||
    s.includes("COND 4") ||
    s.includes("KRITIS") ||
    s.includes("BAHAYA") ||
    s.includes("BURUK")
  ) {
    iconUrl = "/markers/pin-critical.gif";
  }
  // PRIORITAS 2: ORANGE (Kondisi 2, Waspada) - TAHAN DI SINI JANGAN SAMPAI JADI MERAH
  else if (
    s.includes("COND 2") ||
    s.includes("WASPADA") ||
    s.includes("WARNING")
  ) {
    iconUrl = "/markers/pin-warning2.gif";
  }
  // PRIORITAS 3: HIJAU
  else {
    iconUrl = "/markers/pin-normal.png";
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [60, 60],
    iconAnchor: [22, 60],
    popupAnchor: [0, -55],
    className: "custom-marker-img",
  });
};

// Gas Configuration for Trending Chart
const GAS_CONFIG = [
  { key: "TDCG", color: "#10b981", type: "area" },
  { key: "H2", color: "#3b82f6", type: "line", strokeWidth: 2 },
  { key: "CH4", color: "#eab308", type: "line", strokeWidth: 2 },
  { key: "C2H6", color: "#a855f7", type: "line", strokeWidth: 2 },
  { key: "C2H4", color: "#f97316", type: "line", strokeWidth: 2 },
  { key: "C2H2", color: "#ef4444", type: "line", strokeWidth: 2 },
  { key: "CO", color: "#64748b", type: "line", strokeWidth: 2, dash: "5 5" },
  { key: "CO2", color: "#06b6d4", type: "line", strokeWidth: 2, dash: "5 5" },
];

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const DashboardPage = ({ isDarkMode, liveData = [] }) => {
  const safeLiveData = Array.isArray(liveData) ? liveData : [];
  const [selectedTrafo, setSelectedTrafo] = useState(null);
  const [activeSeries, setActiveSeries] = useState(
    GAS_CONFIG.reduce((acc, gas) => {
      acc[gas.key] = true;
      return acc;
    }, {})
  );

  const toggleSeries = (key) => {
    setActiveSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Disable body scroll when modal is open
  useEffect(() => {
    if (selectedTrafo) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedTrafo]);

  const totalStats = Object.values(ultgData).reduce(
    (acc, curr) => ({
      gi: acc.gi + curr.stats.gi,
      td: acc.td + curr.stats.td,
    }),
    { gi: 0, td: 0 }
  );

  // --- 2. LOGIKA PERINGKAT (DIPERBAIKI AGAR COND 2 TETAP ORANGE) ---
  const topTrafos = useMemo(() => {
    if (safeLiveData.length === 0) return [];

    // Ambil data dengan TDCG tertinggi untuk setiap trafo (bukan data terbaru)
    const highestTdcgMap = new Map();
    safeLiveData.forEach((item) => {
      const key = `${(item.lokasi_gi || "").toUpperCase()}-${(
        item.nama_trafo || ""
      ).toUpperCase()}`;
      const currentTdcg = parseFloat(item.tdcg) || parseFloat(item.tdcg_value) || 0;
      
      if (!highestTdcgMap.has(key)) {
        highestTdcgMap.set(key, item);
      } else {
        const existingTdcg = parseFloat(highestTdcgMap.get(key).tdcg) || 
                             parseFloat(highestTdcgMap.get(key).tdcg_value) || 0;
        // Simpan data dengan TDCG tertinggi, bukan data terbaru
        if (currentTdcg > existingTdcg) {
          highestTdcgMap.set(key, item);
        }
      }
    });

    return Array.from(highestTdcgMap.values())
      .map((item) => {
        const gasVal = parseFloat(item.tdcg) || parseFloat(item.tdcg_value) || 0;
        const raw = (item.ieee_status || "").toString().toUpperCase();
        let statusLabel = "";

        if (raw.includes("COND 3") || raw.includes("KRITIS") || raw.includes("BAHAYA")) {
          statusLabel = "Kondisi 3 - KRITIS";
        } else if (raw.includes("COND 2") || raw.includes("WASPADA")) {
          statusLabel = "Kondisi 2 - WASPADA";
        } else if (raw.includes("NORMAL")) {
          if (gasVal >= 720) statusLabel = "Kondisi 3 - KRITIS (High Gas)";
          else if (gasVal >= 300) statusLabel = "Kondisi 2 - WASPADA (High Gas)";
          else statusLabel = "Kondisi 1 - NORMAL";
        } else {
          // fallback based on gas if raw label is not explicit
          if (gasVal >= 720) statusLabel = "Kondisi 3 - KRITIS";
          else if (gasVal >= 300) statusLabel = "Kondisi 2 - WASPADA";
          else statusLabel = "Kondisi 1 - NORMAL";
        }

        return {
          gi: item.lokasi_gi,
          unit: item.nama_trafo,
          tdcg: gasVal,
          status: statusLabel,
          id: item.id,
          date: item.tanggal_sampling || "",
        };
      })
      .sort((a, b) => b.tdcg - a.tdcg)
      .slice(0, 5);
  }, [safeLiveData]);

  // Chart data for modal
  const chartData = useMemo(() => {
    if (!selectedTrafo) return [];

    return safeLiveData
      .filter(
        (d) =>
          d.lokasi_gi === selectedTrafo.gi &&
          d.nama_trafo === selectedTrafo.unit
      )
      .map((d) => ({
        dateLabel: formatDate(d.tanggal_sampling),
        dateOriginal: d.tanggal_sampling,
        H2: parseFloat(d.h2) || 0,
        CH4: parseFloat(d.ch4) || 0,
        C2H6: parseFloat(d.c2h6) || 0,
        C2H4: parseFloat(d.c2h4) || 0,
        C2H2: parseFloat(d.c2h2) || 0,
        CO: parseFloat(d.co) || 0,
        CO2: parseFloat(d.co2) || 0,
        TDCG: d.tdcg
          ? Number(d.tdcg)
          : Number(d.h2) +
            Number(d.ch4) +
            Number(d.c2h6) +
            Number(d.c2h4) +
            Number(d.c2h2) +
            Number(d.co),
      }))
      .sort((a, b) => new Date(a.dateOriginal) - new Date(b.dateOriginal));
  }, [selectedTrafo, safeLiveData]);

  // --- 3. LOGIKA PIN PETA (FIX: PRIORITAS LABEL DI ATAS ANGKA) ---
  const getWorstCaseStatus = (giNameMap) => {
    const defaultRes = {
      status: "Normal",
      unit: "-",
      tdcg: 0,
      details: "Aman",
    };

    if (safeLiveData.length === 0 || !giNameMap) return defaultRes;

    const normalize = (str) =>
      (str || "").toUpperCase().replace(/\s+/g, " ").trim();
    const targetGI = normalize(giNameMap);

    const giRecords = safeLiveData.filter((d) => {
      const dbName = normalize(d.lokasi_gi);
      return dbName.includes(targetGI) || targetGI.includes(dbName);
    });

    if (giRecords.length === 0) return defaultRes;

    const uniqueUnitMap = new Map();
    giRecords.forEach((record) => {
      const unitName = normalize(record.nama_trafo);
      if (
        !uniqueUnitMap.has(unitName) ||
        record.id > uniqueUnitMap.get(unitName).id
      ) {
        uniqueUnitMap.set(unitName, record);
      }
    });

    const latestUnits = Array.from(uniqueUnitMap.values());

    // FUNGSI SKOR BARU (Strict Label Priority)
    const getSeverityScore = (record) => {
      const s = (record.ieee_status || "").toUpperCase();
      const gas = parseFloat(record.tdcg) || 0;

      // 1. MERAH MUTLAK (Hanya jika status tulisannya Kritis)
      if (s.includes("COND 3") || s.includes("KRITIS") || s.includes("BAHAYA"))
        return 3;

      // 2. ORANGE MUTLAK (Hanya jika status tulisannya Waspada/Cond 2)
      // KITA RETURN 2 DI SINI AGAR TIDAK LANJUT KE CEK GAS DI BAWAH
      if (s.includes("COND 2") || s.includes("WASPADA")) return 2;

      // 3. FALLBACK: Hanya jika status "NORMAL", baru kita curigai angkanya
      // Jika Normal tapi gas tinggi -> Anggap Merah/Orange
      if (gas >= 720) return 3;
      if (gas >= 300) return 2;

      return 1; // Hijau
    };

    latestUnits.sort((a, b) => {
      const scoreA = getSeverityScore(a);
      const scoreB = getSeverityScore(b);

      if (scoreA !== scoreB) return scoreB - scoreA;
      return (parseFloat(b.tdcg) || 0) - (parseFloat(a.tdcg) || 0);
    });

    const winner = latestUnits[0];

    // Final check untuk label display
    let finalStatus = winner.ieee_status || "Normal";
    const gas = parseFloat(winner.tdcg) || 0;

    // Override label HANYA jika status Normal tapi gas tinggi
    if (finalStatus.toUpperCase().includes("NORMAL")) {
      if (gas >= 720) finalStatus = "KRITIS (High Gas)";
      else if (gas >= 300) finalStatus = "WASPADA (High Gas)";
    }

    return {
      status: finalStatus,
      unit: winner.nama_trafo || "-",
      tdcg: gas,
      details: finalStatus,
    };
  };

  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        .leaflet-popup { z-index: 2000; } 
        .leaflet-popup-content-wrapper { border-radius: 12px; overflow: hidden; padding: 0; }
        .leaflet-popup-content { margin: 0; width: 340px !important; max-height: 500px; overflow-y: auto; }
        .leaflet-popup-content-wrapper { max-width: 340px !important; }
        
        /* STYLING TOMBOL CLOSE (X) */
        .leaflet-popup-close-button {
          color: #8f1b1b !important;
          font-size: 24px !important;
          font-weight: bold !important;
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
          right: 8px !important;
          top: 8px !important;
          background: rgba(255, 255, 255, 0.9) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        
        .leaflet-popup-close-button:hover {
          background: #1B7A8F !important;
          color: white !important;
        }
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
          <MapContainer
            center={[0.8, 129.0]}
            zoom={8}
            maxBounds={[
              [-1, 121.5], // Diperluas ke Barat (Gorontalo) & Selatan agar tidak terpotong saat zoom
              [3.0, 125.7],  // Diperluas ke Utara (Pulau-pulau) & Timur
            ]}
            maxBoundsViscosity={1.0}
            minZoom={8}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; PLN UPT Manado"
              url={
                isDarkMode
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />

            {allGIs.map((gi, idx) => {
              const { status, unit, tdcg, details } = getWorstCaseStatus(
                gi.name
              );
              const trafoList = trafoDatabase[gi.name] || [];

              return (
                <Marker
                  key={idx}
                  position={[gi.lat, gi.lng]}
                  icon={createCustomIcon(status)}
                >
                  <Popup maxWidth={340} minWidth={320} keepInView={true}>
                    <div className="font-sans text-gray-800">
                      <div
                        className={`p-4 text-white ${
                          status.toUpperCase().includes("KRITIS") ||
                          status.toUpperCase().includes("COND 3")
                            ? "bg-red-600"
                            : status.toUpperCase().includes("WASPADA") ||
                              status.toUpperCase().includes("COND 2")
                            ? "bg-orange-500"
                            : "bg-blue-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Server size={18} />
                          <h3 className="font-bold text-lg m-0 leading-none">
                            {gi.name}
                          </h3>
                        </div>
                        <p className="text-[10px] m-0 opacity-80 font-mono">
                          Lat: {gi.lat.toFixed(4)}, Lng: {gi.lng.toFixed(4)}
                        </p>
                        <div className="mt-3 bg-black/20 px-3 py-1 rounded text-xs font-bold inline-block">
                          Status: {details}
                        </div>
                      </div>

                      {/* Notifikasi */}
                      {status.toUpperCase().includes("NORMAL") === false && (
                        <div className="bg-yellow-50 p-3 border-b border-yellow-100 text-xs text-gray-700">
                          <strong className="text-red-600 block mb-1">
                            ⚠️ Unit {unit}
                          </strong>
                          Terdeteksi {status} ({tdcg} ppm).
                        </div>
                      )}

                      <div className="bg-gray-50 max-h-[300px] overflow-y-auto p-3 space-y-3">
                        {trafoList.map((t, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border shadow-sm bg-white border-gray-200"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-blue-800 text-sm">
                                {t.name}
                              </span>
                              <span className="text-[9px] bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                                {t.merk}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500">
                              S/N: {t.sn}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* --- RANKING LIST (Kanan) --- */}
        <div
          className={`rounded-2xl border shadow-sm p-6 flex flex-col ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/10">
            <h3 className={`font-bold ${textMain}`}>
              <div className="flex items-center gap-2.5">
                  <Trophy className="text-yellow-500" size={20}/>
                    TOP HIGH TDCG TRAFO
              </div>
            </h3>
            <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded">
              Sorted by TDCG
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {topTrafos.map((item, idx) => {
              let barColor = "bg-green-500";
              let textColor = "text-green-600";

              const s = (item.status || "Normal").toString().toUpperCase();

              // LOGIKA WARNA LIST: Utamakan Label Status!
              // 1. Label Merah
              if (s.includes("COND 3") || s.includes("KRITIS")) {
                barColor = "bg-red-600";
                textColor = "text-red-600";
              }
              // 2. Label Orange
              else if (s.includes("COND 2") || s.includes("WASPADA")) {
                barColor = "bg-orange-500";
                textColor = "text-orange-600";
              }
              // 3. Fallback jika Label Normal tapi Gas Tinggi
              else if (item.tdcg >= 720) {
                barColor = "bg-red-600";
                textColor = "text-red-600";
              } else if (item.tdcg >= 300) {
                barColor = "bg-orange-500";
                textColor = "text-orange-600";
              }

              return (
                <div
                  key={idx}
                  className="group border-b border-gray-100 pb-2 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 p-2 rounded transition-colors"
                  onClick={() => setSelectedTrafo(item)}
                >
                  <div className="flex justify-between items-end mb-1">
                    <div>
                      <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                        <span className="inline-flex items-center gap-2">
                          <span>{item.gi}</span>
                          {item.date && (
                            <span className="text-[10px] font-normal text-gray-500">{item.date}</span>
                          )}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-blue-500" />
                        <p className={`text-sm font-bold ${textMain}`}>
                          {item.unit}
                        </p>
                      </div>
                      <p className={`text-[10px] ${textColor} font-bold`}>
                        {item.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-black ${textColor} flex items-center justify-end gap-1`}
                      >
                        <Flame size={14} /> {item.tdcg.toFixed(0)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${barColor}`}
                      style={{
                        width: `${Math.min((item.tdcg / 2000) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Trending Chart */}
      {selectedTrafo && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm overflow-hidden" style={{ margin: 0, padding: 0 }}>
          <div
            className={`w-[95%] max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh] m-4 ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            {/* Header */}
            <div
              className={`flex justify-between items-center p-6 border-b ${
                isDarkMode ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <div>
                <h3
                  className={`text-xl font-bold flex items-center gap-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  <TrendingUp className="text-blue-500" size={24} />
                  Analisis Trending - {selectedTrafo.gi}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {selectedTrafo.unit}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrafo(null)}
                className={`p-2 rounded-full transition ${
                  isDarkMode
                    ? "hover:bg-slate-700 text-white"
                    : "hover:bg-gray-100 text-gray-800"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Info Bar & Gas Type Toggle Buttons */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  <span className="font-bold">{chartData.length}</span> data sampel ditemukan
                </div>
                <div className="flex flex-wrap gap-2">
                  {GAS_CONFIG.map((gas) => (
                  <button
                    key={gas.key}
                    onClick={() => toggleSeries(gas.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      activeSeries[gas.key]
                        ? `bg-opacity-10 border-opacity-50`
                        : `opacity-50 grayscale border-transparent ${
                            isDarkMode
                              ? "bg-slate-700"
                              : "bg-gray-100"
                          }`
                    }`}
                    style={{
                      backgroundColor: activeSeries[gas.key]
                        ? `${gas.color}20`
                        : undefined,
                      borderColor: activeSeries[gas.key]
                        ? gas.color
                        : undefined,
                      color: activeSeries[gas.key]
                        ? gas.color
                        : isDarkMode
                        ? "#94a3b8"
                        : "#64748b",
                    }}
                  >
                    {activeSeries[gas.key] ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Circle size={12} />
                    )}
                    {gas.key}
                  </button>
                ))}
                </div>
              </div>

              {/* Chart */}
              <div
                style={{ width: "100%", height: "450px", minHeight: "450px" }}
              >
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 0, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorTDCG"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.1}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? "#334155" : "#e2e8f0"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="dateLabel"
                        stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                        tick={{ fontSize: 10 }}
                        tickMargin={10}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                        tick={{ fontSize: 11 }}
                        label={{
                          value: "ppm",
                          angle: -90,
                          position: "insideLeft",
                          fill: isDarkMode ? "#94a3b8" : "#64748b",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1e293b" : "#fff",
                          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                          borderRadius: "8px",
                        }}
                        labelStyle={{
                          color: isDarkMode ? "#fff" : "#000",
                          marginBottom: "0.5rem",
                          fontWeight: "bold",
                        }}
                      />

                      {/* Dynamic Rendering */}
                      {GAS_CONFIG.map((gas) => {
                        if (!activeSeries[gas.key]) return null;

                        if (gas.type === "area") {
                          return (
                            <Area
                              key={gas.key}
                              type="monotone"
                              dataKey={gas.key}
                              stroke={gas.color}
                              fill={`url(#color${gas.key})`}
                              strokeWidth={2}
                              isAnimationActive={false}
                            />
                          );
                        }
                        return (
                          <Line
                            key={gas.key}
                            type="monotone"
                            dataKey={gas.key}
                            stroke={gas.color}
                            strokeWidth={gas.strokeWidth || 2}
                            dot={false}
                            strokeDasharray={gas.dash}
                            activeDot={{ r: 6 }}
                            isAnimationActive={false}
                          />
                        );
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <AlertCircle size={48} className="text-gray-400 mb-4" />
                    <h3
                      className={`text-xl font-bold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Data Tidak Ditemukan
                    </h3>
                    <p
                      className={`text-sm mt-2 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Belum ada data history untuk aset ini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
