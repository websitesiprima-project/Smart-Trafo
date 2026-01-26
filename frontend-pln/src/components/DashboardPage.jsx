import React, { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { allGIs } from "../data/assetData";
import {
  Map as MapIcon,
  Zap,
  Server,
  Flame,
  Trophy,
  X,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  AlertTriangle,
  ArrowLeft,
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

  if (s.includes("COND 3") || s.includes("KRITIS") || s.includes("BAHAYA")) {
    iconUrl = "/markers/pin-critical.gif";
  } else if (s.includes("COND 2") || s.includes("WASPADA")) {
    iconUrl = "/markers/pin-warning2.gif";
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -45],
    className: "custom-marker-img",
  });
};

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

const COLORS_PIE = {
  Normal: "#10b981",
  Waspada: "#f59e0b",
  Kritis: "#ef4444",
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

const DashboardPage = ({ isDarkMode, liveData = [] }) => {
  const safeLiveData = Array.isArray(liveData) ? liveData : [];
  const [selectedTrafo, setSelectedTrafo] = useState(null);

  // State untuk GI yang diklik
  const [selectedGI, setSelectedGI] = useState(null);

  const [activeSeries, setActiveSeries] = useState(
    GAS_CONFIG.reduce((acc, gas) => {
      acc[gas.key] = true;
      return acc;
    }, {})
  );

  const toggleSeries = (key) =>
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    document.body.style.overflow = selectedTrafo ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedTrafo]);

  // --- FUNGSI NORMALISASI NAMA (PENTING!) ---
  // Kita hanya merapikan spasi dan uppercase.
  // JANGAN HAPUS "GI" ATAU "GIS" AGAR TETAP BEDA.
  const normalizeName = (name) => {
    if (!name) return "";
    return name.toString().toUpperCase().trim().replace(/\s+/g, " ");
    // Contoh: "  GI   Likupang  New " -> "GI LIKUPANG NEW"
  };

  // --- LOGIC 1: GLOBAL STATS & RANKING ---
  const topTrafos = useMemo(() => {
    if (safeLiveData.length === 0) return [];
    const map = new Map();
    safeLiveData.forEach((item) => {
      // Key unik berdasarkan GI + Nama Trafo
      const key = `${normalizeName(item.lokasi_gi)}-${normalizeName(
        item.nama_trafo
      )}`;
      const currentTdcg = parseFloat(item.tdcg) || 0;

      // Ambil data terbaru atau yang TDCG lebih tinggi
      if (!map.has(key) || currentTdcg > (parseFloat(map.get(key).tdcg) || 0)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values())
      .map((item) => ({
        gi: item.lokasi_gi,
        unit: item.nama_trafo,
        tdcg: parseFloat(item.tdcg) || 0,
        status: item.status_ieee || "Normal",
        id: item.id,
        date: formatDate(item.tanggal_sampling),
      }))
      .sort((a, b) => b.tdcg - a.tdcg)
      .slice(0, 5);
  }, [safeLiveData]);

  const globalStats = useMemo(() => {
    let normal = 0,
      waspada = 0,
      kritis = 0,
      totalGas = 0,
      count = 0;
    const uniqueTrafos = new Map();
    safeLiveData.forEach((d) => {
      const key = `${normalizeName(d.lokasi_gi)}-${normalizeName(
        d.nama_trafo
      )}`;
      if (!uniqueTrafos.has(key) || d.id > uniqueTrafos.get(key).id) {
        uniqueTrafos.set(key, d);
      }
    });
    uniqueTrafos.forEach((d) => {
      const s = (d.status_ieee || "").toUpperCase();
      const gas = parseFloat(d.tdcg) || 0;
      totalGas += gas;
      count++;
      if (s.includes("KRITIS") || s.includes("COND 3")) kritis++;
      else if (s.includes("WASPADA") || s.includes("COND 2")) waspada++;
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

  // --- LOGIC 2: CHART DATA (MODAL) ---
  const chartData = useMemo(() => {
    if (!selectedTrafo) return [];
    return safeLiveData
      .filter(
        (d) =>
          normalizeName(d.lokasi_gi) === normalizeName(selectedTrafo.gi) &&
          normalizeName(d.nama_trafo) === normalizeName(selectedTrafo.unit)
      )
      .map((d) => ({
        ...d,
        dateLabel: formatDate(d.tanggal_sampling),
        dateOriginal: d.tanggal_sampling,
        TDCG: parseFloat(d.tdcg) || 0,
        H2: parseFloat(d.h2) || 0,
        CH4: parseFloat(d.ch4) || 0,
        C2H6: parseFloat(d.c2h6) || 0,
        C2H4: parseFloat(d.c2h4) || 0,
        C2H2: parseFloat(d.c2h2) || 0,
        CO: parseFloat(d.co) || 0,
        CO2: parseFloat(d.co2) || 0,
      }))
      .sort((a, b) => new Date(a.dateOriginal) - new Date(b.dateOriginal));
  }, [selectedTrafo, safeLiveData]);

  // --- LOGIC 3: FILTER LIST TRAFO BERDASARKAN GI YANG DIKLIK (POPUP) ---
  const getTrafoListByGI = (giName) => {
    if (!safeLiveData.length || !giName) return [];

    const targetGI = normalizeName(giName);

    // 🔥 FIX: PENGGUNAAN EXACT MATCH (===)
    // "GI LIKUPANG" !== "GI LIKUPANG NEW"
    // "GI TELING" !== "GIS TELING"
    const records = safeLiveData.filter(
      (d) => normalizeName(d.lokasi_gi) === targetGI
    );

    // Ambil unique per trafo (data terbaru)
    const uniqueMap = new Map();
    records.forEach((rec) => {
      const unitName = normalizeName(rec.nama_trafo);
      if (!uniqueMap.has(unitName) || rec.id > uniqueMap.get(unitName).id) {
        uniqueMap.set(unitName, rec);
      }
    });

    return Array.from(uniqueMap.values()).sort(
      (a, b) => (parseFloat(b.tdcg) || 0) - (parseFloat(a.tdcg) || 0)
    );
  };

  const getPinStatus = (trafoList) => {
    if (trafoList.length === 0) return "Normal"; // Default jika kosong
    for (const t of trafoList) {
      const s = (t.status_ieee || "").toUpperCase();
      if (s.includes("KRITIS") || s.includes("COND 3")) return "KRITIS";
      if (s.includes("WASPADA") || s.includes("COND 2")) return "WASPADA";
    }
    return "Normal";
  };

  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";
  // --- MAP BOUNDS: HITUNG DARI `allGIs` UNTUK MEMBATASI VIEW ---
  // Adjust `BOUNDS_PADDING_FACTOR` di sini untuk melonggarkan/mengetatkan padding
  const BOUNDS_PADDING_FACTOR = 0.25; // default 0.10 sebelumnya, tingkatkan untuk lebih longgar

  const mapBounds = React.useMemo(() => {
    if (!Array.isArray(allGIs) || allGIs.length === 0) return null;
    const lats = allGIs
      .map((g) => Number(g.lat))
      .filter((n) => Number.isFinite(n));
    const lngs = allGIs
      .map((g) => Number(g.lng))
      .filter((n) => Number.isFinite(n));
    if (lats.length === 0 || lngs.length === 0) return null;
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Tambah padding supaya marker tidak tepat di tepi
    const latPad = (maxLat - minLat) * BOUNDS_PADDING_FACTOR || 5;
    const lngPad = (maxLng - minLng) * BOUNDS_PADDING_FACTOR || 5;

    return [
      [minLat - latPad, minLng - lngPad],
      [maxLat + latPad, maxLng + lngPad],
    ];
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        /* FIX POPUP MAP STYLE */
        .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; overflow: hidden; }
        .leaflet-popup-content { margin: 0; width: 320px !important; }
        .custom-popup-scroll::-webkit-scrollbar { width: 4px; }
        .custom-popup-scroll::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-popup-scroll::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
      `}</style>

      {/* HEADER STATS */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${textMain}`}>
          Executive Dashboard
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-blue-500`}
          >
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
              <MapIcon size={24} />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                Total GI
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {allGIs.length}
              </p>
            </div>
          </div>
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-yellow-500`}
          >
            <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
              <Zap size={24} />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                Total Aset
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {globalStats.totalAssets}
              </p>
            </div>
          </div>
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-red-500`}
          >
            <div className="p-3 rounded-full bg-red-500/10 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                Kritis
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {globalStats.pieData[2].value}
              </p>
            </div>
          </div>
          <div
            className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg} border-l-4 border-l-purple-500`}
          >
            <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
              <Activity size={24} />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase ${textSub}`}>
                Rata-rata TDCG
              </p>
              <p className={`text-3xl font-black ${textMain}`}>
                {globalStats.avgTdcg}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: MAP (Lebar 2 Kolom) */}
        <div
          className={`lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden h-[650px] relative z-0 ${cardBg}`}
        >
          <MapContainer
            center={[0.8, 124.5]}
            zoom={8}
            minZoom={7.5}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
            bounds={mapBounds || undefined}
            maxBounds={mapBounds || undefined}
            maxBoundsViscosity={0.05}
          >
            <TileLayer
              attribution="&copy; PLN"
              url={
                isDarkMode
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />

            {allGIs.map((gi, idx) => {
              const trafoList = getTrafoListByGI(gi.name);
              const status = getPinStatus(trafoList);

              return (
                <Marker
                  key={idx}
                  position={[gi.lat, gi.lng]}
                  icon={createCustomIcon(status)}
                >
                  {/* POPUP: Menampilkan List Trafo di GI Tersebut */}
                  <Popup>
                    <div className="font-sans text-gray-800">
                      {/* Header Popup */}
                      <div
                        className={`p-3 text-white flex justify-between items-center ${
                          status.includes("KRITIS")
                            ? "bg-red-600"
                            : status.includes("WASPADA")
                            ? "bg-orange-500"
                            : "bg-blue-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Server size={16} />
                          <h3 className="font-bold text-sm m-0 uppercase">
                            {gi.name}
                          </h3>
                        </div>
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-bold">
                          {trafoList.length} Unit
                        </span>
                      </div>

                      {/* Body Popup: Scrollable List */}
                      <div className="bg-white max-h-[250px] overflow-y-auto custom-popup-scroll">
                        {trafoList.length > 0 ? (
                          trafoList.map((item, i) => (
                            <div
                              key={i}
                              onClick={() =>
                                setSelectedTrafo({
                                  gi: item.lokasi_gi,
                                  unit: item.nama_trafo,
                                })
                              }
                              className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center group"
                            >
                              <div>
                                <p className="font-bold text-sm text-gray-800 group-hover:text-blue-600">
                                  {item.nama_trafo}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  TDCG:{" "}
                                  <span className="font-bold">
                                    {Math.round(item.tdcg)} ppm
                                  </span>
                                </p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    (item.status_ieee || "").includes("KRITIS")
                                      ? "bg-red-500 text-white"
                                      : (item.status_ieee || "").includes(
                                          "WASPADA"
                                        )
                                      ? "bg-orange-500 text-white"
                                      : "bg-green-500 text-white"
                                  }`}
                                >
                                  {(item.status_ieee || "Normal").split(" ")[0]}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-400 text-xs">
                            Belum ada data unit.
                          </div>
                        )}
                      </div>

                      {/* Footer Popup */}
                      {trafoList.length > 0 && (
                        <div className="p-2 bg-gray-50 text-[10px] text-center text-gray-500 border-t">
                          Klik unit untuk lihat grafik
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* KOLOM KANAN: SIDE PANEL (KEMBALI KE DEFAULT) */}
        <div className="flex flex-col gap-6 h-[650px]">
          {/* PIE CHART */}
          <div
            className={`flex-1 rounded-2xl border shadow-sm p-5 relative flex flex-col items-center justify-center ${cardBg}`}
          >
            <h3
              className={`absolute top-5 left-5 font-bold text-sm uppercase flex items-center gap-2 ${textMain}`}
            >
              <PieIcon size={16} /> Distribusi Kondisi
            </h3>
            <div className="w-full h-full min-h-[180px]">
              <ResponsiveContainer>
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
                    {globalStats.pieData.map((e, i) => (
                      <Cell
                        key={i}
                        fill={COLORS_PIE[e.name] || "#ccc"}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none" }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
              <span className={`text-3xl font-black ${textMain}`}>
                {globalStats.totalAssets}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Aset
              </span>
            </div>
          </div>

          {/* RANKING */}
          <div
            className={`flex-[1.5] rounded-2xl border shadow-sm p-0 flex flex-col overflow-hidden ${cardBg}`}
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h3
                className={`font-bold text-sm flex items-center gap-2 ${textMain}`}
              >
                <Trophy className="text-yellow-500" size={16} /> Top Highest
                TDCG
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {topTrafos.length === 0 ? (
                <div className="text-center p-4 opacity-50 text-xs">
                  Data Kosong
                </div>
              ) : (
                topTrafos.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      setSelectedTrafo({ gi: item.gi, unit: item.unit })
                    }
                    className="group p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0 transition"
                  >
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 font-bold">
                          {item.gi}
                        </span>
                        <p className={`font-bold text-sm mt-1 ${textMain}`}>
                          {item.unit}
                        </p>
                      </div>
                      <p className="text-red-500 font-black text-lg flex items-center gap-1">
                        <Flame size={14} /> {item.tdcg.toFixed(0)}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${Math.min((item.tdcg / 1000) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL GRAFIK DETAIL */}
      {selectedTrafo && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <div
              className={`flex justify-between items-center p-6 border-b ${
                isDarkMode ? "border-slate-700" : "border-gray-100"
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
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex flex-wrap gap-2 mb-4 justify-end">
                {GAS_CONFIG.map((gas) => (
                  <button
                    key={gas.key}
                    onClick={() => toggleSeries(gas.key)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                      activeSeries[gas.key]
                        ? "bg-blue-500/10 text-blue-600 border-blue-500"
                        : "opacity-50 grayscale"
                    }`}
                  >
                    {gas.key}
                  </button>
                ))}
              </div>
              <div style={{ width: "100%", height: "400px" }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDarkMode ? "#334155" : "#e2e8f0"}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      stroke="#888"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1e293b" : "#fff",
                        borderRadius: "8px",
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
                            fill={gas.color}
                            fillOpacity={0.1}
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
