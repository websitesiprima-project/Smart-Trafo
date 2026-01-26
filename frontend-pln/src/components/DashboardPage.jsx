import React, { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ultgData, allGIs, trafoDatabase } from "../data/assetData";
import {
  Map as MapIcon,
  Zap,
  Server,
  Flame,
  Trophy,
  X,
  TrendingUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  PieChart as PieIcon,
  Activity,
  AlertTriangle,
  Info,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// --- 1. SETUP IKON MAP ---
const createCustomIcon = (status) => {
  let iconUrl = "/markers/pin-normal.png";
  const s = (status || "").toString().toUpperCase();

  if (
    s.includes("COND 3") ||
    s.includes("COND 4") ||
    s.includes("KRITIS") ||
    s.includes("BAHAYA") ||
    s.includes("BURUK")
  ) {
    iconUrl = "/markers/pin-critical.gif";
  } else if (
    s.includes("COND 2") ||
    s.includes("WASPADA") ||
    s.includes("WARNING")
  ) {
    iconUrl = "/markers/pin-warning2.gif";
  } else {
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

// Gas Configuration
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

// Colors for Pie Chart
const COLORS_PIE = {
  Normal: "#10b981", // Emerald 500
  Waspada: "#f59e0b", // Amber 500
  Kritis: "#ef4444", // Red 500
};

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

  useEffect(() => {
    if (selectedTrafo) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [selectedTrafo]);

  // --- 2. DATA AGGREGATION & LOGIC ---

  // A. Logic Ranking (Top High TDCG)
  const topTrafos = useMemo(() => {
    if (safeLiveData.length === 0) return [];
    const highestTdcgMap = new Map();

    safeLiveData.forEach((item) => {
      const key = `${(item.lokasi_gi || "").toUpperCase()}-${(
        item.nama_trafo || ""
      ).toUpperCase()}`;
      const currentTdcg =
        parseFloat(item.tdcg) || parseFloat(item.tdcg_value) || 0;

      if (!highestTdcgMap.has(key)) {
        highestTdcgMap.set(key, item);
      } else {
        const existingTdcg = parseFloat(highestTdcgMap.get(key).tdcg) || 0;
        if (currentTdcg > existingTdcg) highestTdcgMap.set(key, item);
      }
    });

    return Array.from(highestTdcgMap.values())
      .map((item) => {
        const gasVal = parseFloat(item.tdcg) || 0;
        const raw = (item.status_ieee || item.ieee_status || "")
          .toString()
          .toUpperCase();
        let statusLabel = "Normal";

        if (raw.includes("COND 3") || raw.includes("KRITIS"))
          statusLabel = "Kondisi 3 - KRITIS";
        else if (raw.includes("COND 2") || raw.includes("WASPADA"))
          statusLabel = "Kondisi 2 - WASPADA";
        else {
          if (gasVal >= 720) statusLabel = "Kondisi 3 - KRITIS (High Gas)";
          else if (gasVal >= 300)
            statusLabel = "Kondisi 2 - WASPADA (High Gas)";
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

  // B. Logic Statistik Global (Pie Chart & Cards)
  const globalStats = useMemo(() => {
    let normal = 0,
      waspada = 0,
      kritis = 0,
      totalGas = 0,
      count = 0;

    // Gunakan data unik per trafo (snapshot terakhir)
    const uniqueTrafos = new Map();
    safeLiveData.forEach((d) => {
      const key = `${d.lokasi_gi}-${d.nama_trafo}`;
      if (!uniqueTrafos.has(key) || d.id > uniqueTrafos.get(key).id) {
        uniqueTrafos.set(key, d);
      }
    });

    uniqueTrafos.forEach((d) => {
      const s = (d.status_ieee || d.ieee_status || "").toUpperCase();
      const gas = parseFloat(d.tdcg) || 0;
      totalGas += gas;
      count++;

      if (s.includes("COND 3") || s.includes("KRITIS") || gas >= 720) kritis++;
      else if (s.includes("COND 2") || s.includes("WASPADA") || gas >= 300)
        waspada++;
      else normal++;
    });

    return {
      pieData: [
        { name: "Normal", value: normal },
        { name: "Waspada", value: waspada },
        { name: "Kritis", value: kritis },
      ],
      avgTdcg: count > 0 ? (totalGas / count).toFixed(0) : 0,
      totalAssets: count,
    };
  }, [safeLiveData]);

  // Chart data for Modal
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
        TDCG: parseFloat(d.tdcg) || 0,
      }))
      .sort((a, b) => new Date(a.dateOriginal) - new Date(b.dateOriginal));
  }, [selectedTrafo, safeLiveData]);

  // --- 3. LOGIKA PIN PETA (FIX: EXACT MATCH) ---
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

    // EXACT MATCH LOGIC (Perbaikan Utama)
    const giRecords = safeLiveData.filter(
      (d) => normalize(d.lokasi_gi) === targetGI
    );

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

    const getSeverityScore = (record) => {
      const s = (record.ieee_status || "").toUpperCase();
      const gas = parseFloat(record.tdcg) || 0;
      if (s.includes("COND 3") || s.includes("KRITIS")) return 3;
      if (s.includes("COND 2") || s.includes("WASPADA")) return 2;
      if (gas >= 720) return 3;
      if (gas >= 300) return 2;
      return 1;
    };

    latestUnits.sort((a, b) => {
      const scoreA = getSeverityScore(a);
      const scoreB = getSeverityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (parseFloat(b.tdcg) || 0) - (parseFloat(a.tdcg) || 0);
    });

    const winner = latestUnits[0];
    let finalStatus = winner.ieee_status || "Normal";
    const gas = parseFloat(winner.tdcg) || 0;

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
        .leaflet-popup-content-wrapper { border-radius: 12px; max-width: 340px !important; }
        .leaflet-popup-content { margin: 0; width: 340px !important; }
        .leaflet-popup-close-button { color: #8f1b1b !important; font-size: 24px !important; font-weight: bold !important; width: 30px !important; height: 30px !important; line-height: 30px !important; right: 8px !important; top: 8px !important; background: rgba(255, 255, 255, 0.9) !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important; }
        .leaflet-popup-close-button:hover { background: #1B7A8F !important; color: white !important; }
      `}</style>

      {/* --- HEADER STATS (EXPANDED) --- */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${textMain}`}>
          Executive Dashboard
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total GI */}
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-blue-500`}
          >
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
              <MapIcon size={24} />
            </div>
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${textSub}`}
              >
                Total GI
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {allGIs.length}
              </p>
            </div>
          </div>
          {/* Card 2: Total Trafo */}
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-yellow-500`}
          >
            <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
              <Zap size={24} />
            </div>
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${textSub}`}
              >
                Total Trafo
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {Object.values(trafoDatabase).flat().length}
              </p>
            </div>
          </div>
          {/* Card 3: Alert Kritis */}
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-red-500`}
          >
            <div className="p-3 rounded-full bg-red-500/10 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${textSub}`}
              >
                Trafo Kritis
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {globalStats.pieData[2].value}
              </p>
            </div>
          </div>
          {/* Card 4: Avg TDCG */}
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-purple-500`}
          >
            <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
              <Activity size={24} />
            </div>
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${textSub}`}
              >
                Rata-rata TDCG
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {globalStats.avgTdcg}{" "}
                <span className="text-sm font-normal opacity-60">ppm</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (GRID MAP & CHARTS) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: MAP (Lebar 2 Kolom) */}
        <div
          className={`lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden h-[650px] relative z-0 ${cardBg}`}
        >
          <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-black/50 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 shadow-sm">
            Live Monitoring Map
          </div>
          <MapContainer
            center={[0.8, 124.5]}
            zoom={8}
            maxBounds={[
              [-1, 121.5],
              [3.0, 126.7],
            ]}
            maxBoundsViscosity={1.0}
            minZoom={7}
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
                            : status.toUpperCase().includes("WASPADA")
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
                      {!status.toUpperCase().includes("NORMAL") && (
                        <div className="bg-yellow-50 p-3 border-b border-yellow-100 text-xs text-gray-700">
                          <strong className="text-red-600 block mb-1">
                            ⚠️ Unit {unit}
                          </strong>{" "}
                          Terdeteksi {status} ({tdcg} ppm).
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* KOLOM KANAN: PIE CHART & LIST (Lebar 1 Kolom) */}
        <div className="flex flex-col gap-6 h-[650px]">
          {/* 1. PIE CHART CARD */}
          <div
            className={`flex-1 rounded-2xl border shadow-sm p-5 flex flex-col items-center justify-center relative ${cardBg}`}
          >
            <h3
              className={`absolute top-5 left-5 font-bold text-sm uppercase flex items-center gap-2 ${textMain}`}
            >
              <PieIcon size={16} className="text-blue-500" /> Distribusi Kondisi
            </h3>
            <div className="w-full h-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={globalStats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {globalStats.pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS_PIE[entry.name] || "#ccc"}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
              <span className={`text-3xl font-black ${textMain}`}>
                {globalStats.totalAssets}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400">
                Total Aset
              </span>
            </div>
          </div>

          {/* 2. RANKING LIST CARD */}
          <div
            className={`flex-[1.5] rounded-2xl border shadow-sm p-0 flex flex-col overflow-hidden ${cardBg}`}
          >
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3
                className={`font-bold text-sm flex items-center gap-2 ${textMain}`}
              >
                <Trophy className="text-yellow-500" size={16} /> Top Highest
                TDCG
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {topTrafos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                  <AlertCircle size={32} className="mb-2" />
                  <span className="text-xs">Belum ada data history</span>
                </div>
              ) : (
                topTrafos.map((item, idx) => {
                  let barColor = "bg-green-500";
                  let textColor = "text-green-600";
                  const s = (item.status || "Normal").toString().toUpperCase();
                  if (s.includes("KRITIS")) {
                    barColor = "bg-red-600";
                    textColor = "text-red-600";
                  } else if (s.includes("WASPADA")) {
                    barColor = "bg-orange-500";
                    textColor = "text-orange-600";
                  } else if (item.tdcg >= 720) {
                    barColor = "bg-red-600";
                    textColor = "text-red-600";
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTrafo(item)}
                      className="group p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-all border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {item.gi}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {item.date}
                            </span>
                          </div>
                          <p className={`font-bold text-sm mt-1 ${textMain}`}>
                            {item.unit}
                          </p>
                        </div>
                        <div className={`text-right ${textColor}`}>
                          <p className="text-xs font-bold opacity-80">
                            {item.status.split("-")[0]}
                          </p>
                          <p className="text-lg font-black flex items-center justify-end gap-1 leading-none mt-1">
                            <Flame size={14} /> {item.tdcg.toFixed(0)}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{
                            width: `${Math.min(
                              (item.tdcg / 2000) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL CHART (Tetap Sama) --- */}
      {selectedTrafo && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-hidden">
          <div
            className={`w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <div
              className={`flex justify-between items-center p-6 border-b ${
                isDarkMode ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <div>
                <h3
                  className={`text-xl font-bold flex items-center gap-2 ${textMain}`}
                >
                  <TrendingUp className="text-blue-500" /> Analisis Trending -{" "}
                  {selectedTrafo.gi}
                </h3>
                <p className={`text-sm ${textSub}`}>{selectedTrafo.unit}</p>
              </div>
              <button
                onClick={() => setSelectedTrafo(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {/* Info Bar */}
              <div className="flex flex-wrap gap-2 mb-4 justify-end">
                {GAS_CONFIG.map((gas) => (
                  <button
                    key={gas.key}
                    onClick={() => toggleSeries(gas.key)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                      activeSeries[gas.key]
                        ? "bg-opacity-10"
                        : "opacity-50 grayscale"
                    }`}
                    style={{
                      borderColor: gas.color,
                      backgroundColor: activeSeries[gas.key]
                        ? `${gas.color}20`
                        : "transparent",
                      color: gas.color,
                    }}
                  >
                    {activeSeries[gas.key] ? (
                      <CheckCircle2 size={10} className="inline mr-1" />
                    ) : (
                      <Circle size={10} className="inline mr-1" />
                    )}{" "}
                    {gas.key}
                  </button>
                ))}
              </div>
              <div style={{ width: "100%", height: "400px" }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
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
                      stroke="#888"
                      tick={{ fontSize: 10 }}
                      height={50}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#888"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: "ppm",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1e293b" : "#fff",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      }}
                    />
                    {GAS_CONFIG.map(
                      (gas) =>
                        activeSeries[gas.key] &&
                        (gas.type === "area" ? (
                          <Area
                            key={gas.key}
                            type="monotone"
                            dataKey={gas.key}
                            stroke={gas.color}
                            fill="url(#colorTDCG)"
                            strokeWidth={2}
                          />
                        ) : (
                          <Line
                            key={gas.key}
                            type="monotone"
                            dataKey={gas.key}
                            stroke={gas.color}
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray={gas.dash}
                          />
                        ))
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
