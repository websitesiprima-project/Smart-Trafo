"use client";

import React, { useState, useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  FileBarChart,
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { allGIs, trafoDatabase } from "../data/assetData";

// Konfigurasi Warna & Label Gas
const GAS_CONFIG = [
  { key: "TDCG", color: "#10b981", type: "area" }, // TDCG Area
  { key: "H2", color: "#3b82f6", type: "line" },
  { key: "CH4", color: "#eab308", type: "line" },
  { key: "C2H6", color: "#a855f7", type: "line" },
  { key: "C2H4", color: "#f97316", type: "line" },
  { key: "C2H2", color: "#ef4444", type: "line", strokeWidth: 3 }, // Highlight C2H2 (Bahaya)
  { key: "CO", color: "#64748b", type: "line", dash: "3 3" },
  { key: "CO2", color: "#06b6d4", type: "line", dash: "3 3" },
];

const TrendingPage = ({ isDarkMode, liveData = [] }) => {
  const safeGIs = allGIs || [];
  const safeTrafoDB = trafoDatabase || {};

  const [selectedGI, setSelectedGI] = useState(safeGIs[0]?.name || "");
  const [selectedTrafo, setSelectedTrafo] = useState(() => {
    const initialGI = safeGIs[0]?.name;
    return (initialGI && safeTrafoDB[initialGI]?.[0]?.name) || "";
  });

  // State untuk Toggle Visibility Grafik
  const [activeSeries, setActiveSeries] = useState({
    TDCG: true,
    H2: true,
    CH4: true,
    C2H6: true,
    C2H4: true,
    C2H2: true,
    CO: false,
    CO2: false,
  });

  const handleGIChange = (e) => {
    const newGI = e.target.value;
    setSelectedGI(newGI);
    setSelectedTrafo(safeTrafoDB[newGI]?.[0]?.name || "");
  };

  const toggleSeries = (key) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- PERBAIKAN DISINI: Menambahkan Tahun (numeric) ---
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric", // Menampilkan tahun (Contoh: 20 Jan 2024)
    }).format(date);
  };

  const chartData = useMemo(() => {
    if (!selectedGI || !selectedTrafo || !liveData.length) return [];

    return liveData
      .filter(
        (d) =>
          d && d.lokasi_gi === selectedGI && d.nama_trafo === selectedTrafo,
      )
      .map((d) => ({
        ...d,
        dateOriginal: d.tanggal_sampling || d.created_at,
        dateLabel: formatDate(d.tanggal_sampling || d.created_at),
        H2: Number(d.h2 || 0),
        CH4: Number(d.ch4 || 0),
        C2H6: Number(d.c2h6 || 0),
        C2H4: Number(d.c2h4 || 0),
        C2H2: Number(d.c2h2 || 0),
        CO: Number(d.co || 0),
        CO2: Number(d.co2 || 0),
        TDCG: d.tdcg_value
          ? Number(d.tdcg_value)
          : Number(d.h2) +
            Number(d.ch4) +
            Number(d.c2h6) +
            Number(d.c2h4) +
            Number(d.c2h2) +
            Number(d.co),
      }))
      .sort((a, b) => new Date(a.dateOriginal) - new Date(b.dateOriginal));
  }, [selectedGI, selectedTrafo, liveData]);

  // Style Helpers
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";
  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-gray-200/20">
        <div>
          <h2
            className={`text-3xl font-bold flex items-center gap-3 ${textMain}`}
          >
            <TrendingUp className="text-blue-500" /> Analisis Trending Gas
          </h2>
          <p className={`mt-1 ${textSub}`}>
            Monitoring konsentrasi gas DGA historis.
          </p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className={`p-6 rounded-xl border shadow-sm ${cardBg}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Input Select GI & Trafo */}
          <div>
            <label className={`block text-xs font-bold mb-2 ${textSub}`}>
              Lokasi Gardu Induk
            </label>
            <select
              value={selectedGI}
              onChange={handleGIChange}
              className={`w-full p-3 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isDarkMode
                  ? "bg-slate-900 border-slate-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
            >
              {safeGIs.map((gi, idx) => (
                <option key={idx} value={gi.name}>
                  {gi.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-2 ${textSub}`}>
              Unit Trafo
            </label>
            <select
              value={selectedTrafo}
              onChange={(e) => setSelectedTrafo(e.target.value)}
              disabled={!selectedGI}
              className={`w-full p-3 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isDarkMode
                  ? "bg-slate-900 border-slate-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
            >
              {selectedGI &&
                safeTrafoDB[selectedGI]?.map((t, idx) => (
                  <option key={idx} value={t.name}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
          {/* Total Data Point */}
          <div className="flex items-end">
            <div
              className={`w-full p-3 rounded-lg border flex items-center justify-between ${
                isDarkMode
                  ? "bg-slate-800 border-slate-600"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <span className={`text-xs font-bold ${textSub}`}>
                Total Sampel
              </span>
              <span className={`text-lg font-black ${textMain}`}>
                {chartData.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHART CONTROL & DISPLAY */}
      <div
        className={`p-6 rounded-xl border shadow-lg flex flex-col ${cardBg}`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className={`font-bold flex items-center gap-2 ${textMain}`}>
            <FileBarChart size={20} className="text-green-500" /> Grafik
            Konsentrasi (ppm)
          </h3>

          {/* SERIES TOGGLES */}
          <div className="flex flex-wrap gap-2">
            {GAS_CONFIG.map((gas) => (
              <button
                key={gas.key}
                onClick={() => toggleSeries(gas.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  activeSeries[gas.key]
                    ? `bg-opacity-10 border-opacity-50`
                    : `opacity-50 grayscale border-transparent bg-gray-100 dark:bg-slate-800`
                }`}
                style={{
                  backgroundColor: activeSeries[gas.key]
                    ? `${gas.color}20`
                    : undefined,
                  borderColor: activeSeries[gas.key] ? gas.color : undefined,
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

        <div style={{ width: "100%", height: "500px", minHeight: "500px" }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }} // Tambahkan margin bottom agar label tahun tidak terpotong
              >
                <defs>
                  <linearGradient id="colorTDCG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                  tick={{ fontSize: 10 }} // Sedikit diperkecil agar muat jika tanggal panjang
                  tickMargin={10}
                  angle={-15} // Memiringkan label sedikit agar lebih rapi
                  textAnchor="end"
                  height={60} // Menambah tinggi area XAxis
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
                <Legend verticalAlign="top" height={36} iconType="circle" />

                {/* DYNAMIC RENDERING LINES */}
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
              <h3 className={`text-xl font-bold ${textMain}`}>
                Data Tidak Ditemukan
              </h3>
              <p className={`text-sm mt-2 ${textSub}`}>
                Belum ada data history untuk aset ini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;
