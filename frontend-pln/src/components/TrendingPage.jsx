"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  MapPin,
  Zap,
  ShieldCheck,
} from "lucide-react";

// --- MAPPING ULTG ---
const ULTG_MAPPING = {
  Lopana: [
    "GI Lopana",
    "GI Amurang",
    "GI Tumpaan",
    "GI Motoling",
    "GI Ratahan",
    "Lopana",
    "Amurang",
  ],
  Sawangan: [
    "GI Sawangan",
    "GI Teling",
    "GI Bitung",
    "GI Likupang",
    "GI Likupang New",
    "GI Paniki",
    "GI Tanjung Merah",
  ],
  Kotamobagu: [
    "GI Kotamobagu",
    "GI Lolak",
    "GI Boroko",
    "GI Otam",
    "PLTU SULUT 1",
  ],
  Gorontalo: [
    "GI Gorontalo",
    "GI Isimu",
    "GI Marisa",
    "GI Botupingge",
    "GI Kwandang",
  ],
};

// Konfigurasi Warna & Label Gas
const GAS_CONFIG = [
  { key: "TDCG", color: "#10b981", type: "area" },
  { key: "H2", color: "#3b82f6", type: "line" },
  { key: "CH4", color: "#eab308", type: "line" },
  { key: "C2H6", color: "#a855f7", type: "line" },
  { key: "C2H4", color: "#f97316", type: "line" },
  { key: "C2H2", color: "#ef4444", type: "line", strokeWidth: 3 },
  { key: "CO", color: "#64748b", type: "line", dash: "3 3" },
  { key: "CO2", color: "#06b6d4", type: "line", dash: "3 3" },
];

const TrendingPage = ({ isDarkMode, liveData = [], userRole, userUnit }) => {
  const [selectedGI, setSelectedGI] = useState("");
  const [selectedTrafo, setSelectedTrafo] = useState("");

  // --- LOGIKA UTAMA: APAKAH DIA SUPER ADMIN? ---
  const isSuperAdmin = userRole === "super_admin" || !userUnit;
  // (!userUnit artinya jika unit kosong, kita anggap dia punya akses global/pusat)

  // --- 1. SIAPKAN DATA GI (FILTER) ---
  const availableGIs = useMemo(() => {
    // Ambil semua GI unik dari database
    const allUniqueGIs = [
      ...new Set(liveData.map((item) => item.lokasi_gi || "")),
    ]
      .filter(Boolean)
      .sort();

    // JIKA SUPER ADMIN (atau Unit NULL): TAMPILKAN SEMUA
    if (isSuperAdmin) {
      return allUniqueGIs;
    }

    // JIKA ADMIN UNIT: FILTER SESUAI WILAYAH
    if (userUnit && ULTG_MAPPING[userUnit]) {
      const allowed = ULTG_MAPPING[userUnit];
      return allUniqueGIs.filter((gi) =>
        allowed.some((a) => gi.toLowerCase().includes(a.toLowerCase()))
      );
    }

    // Fallback: Jika punya unit tapi tidak ada di mapping, return kosong (safety)
    return [];
  }, [liveData, userRole, userUnit, isSuperAdmin]);

  // --- 2. SIAPKAN TRAFO ---
  const availableTrafos = useMemo(() => {
    if (!selectedGI) return [];
    return [
      ...new Set(
        liveData
          .filter((item) => item.lokasi_gi === selectedGI)
          .map((item) => item.nama_trafo)
      ),
    ].sort();
  }, [liveData, selectedGI]);

  // Reset Seleksi saat data berubah
  useEffect(() => {
    // Auto select GI pertama jika belum ada yang dipilih
    if (availableGIs.length > 0 && !selectedGI) {
      setSelectedGI(availableGIs[0]);
    }
    // Jika GI yang dipilih tiba-tiba hilang dari daftar akses (misal logout ganti akun)
    if (selectedGI && !availableGIs.includes(selectedGI)) {
      setSelectedGI(availableGIs[0] || "");
      setSelectedTrafo("");
    }
  }, [availableGIs, selectedGI]);

  // --- 3. PROSES DATA GRAFIK ---
  const chartData = useMemo(() => {
    if (!selectedGI || !selectedTrafo || !liveData.length) return [];

    return liveData
      .filter(
        (d) => d && d.lokasi_gi === selectedGI && d.nama_trafo === selectedTrafo
      )
      .map((d) => ({
        ...d,
        dateOriginal: d.tanggal_sampling,
        dateLabel: new Date(d.tanggal_sampling).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        }),
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

  // Chart Toggles
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
  const toggleSeries = (key) =>
    setActiveSeries((p) => ({ ...p, [key]: !p[key] }));

  // Styles
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";
  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-6 border-gray-200/20">
        <div>
          <h2
            className={`text-3xl font-bold flex items-center gap-3 ${textMain}`}
          >
            <TrendingUp className="text-blue-500" /> Analisis Trending
          </h2>
          <p className={`mt-1 ${textSub}`}>
            Monitoring historis gas terlarut (DGA).
          </p>
        </div>
        {isSuperAdmin && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
            <ShieldCheck size={14} /> SUPER ADMIN VIEW
          </div>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className={`p-6 rounded-xl border shadow-sm ${cardBg}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Select GI */}
          <div>
            <label className={`block text-xs font-bold mb-2 ${textSub}`}>
              Gardu Induk
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-3 text-gray-400"
                size={16}
              />
              <select
                value={selectedGI}
                onChange={(e) => {
                  setSelectedGI(e.target.value);
                  setSelectedTrafo("");
                }}
                className={`w-full p-3 pl-10 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                <option value="">-- Pilih GI --</option>
                {availableGIs.map((gi, idx) => (
                  <option key={idx} value={gi}>
                    {gi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Trafo */}
          <div>
            <label className={`block text-xs font-bold mb-2 ${textSub}`}>
              Trafo
            </label>
            <div className="relative">
              <Zap className="absolute left-3 top-3 text-gray-400" size={16} />
              <select
                value={selectedTrafo}
                onChange={(e) => setSelectedTrafo(e.target.value)}
                disabled={!selectedGI}
                className={`w-full p-3 pl-10 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                <option value="">-- Pilih Trafo --</option>
                {availableTrafos.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Count */}
          <div className="flex items-end">
            <div
              className={`w-full p-3 rounded-lg border flex items-center justify-between ${
                isDarkMode
                  ? "bg-slate-800 border-slate-600"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <span className={`text-xs font-bold ${textSub}`}>Total Data</span>
              <span className={`text-lg font-black ${textMain}`}>
                {chartData.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHART DISPLAY */}
      {selectedGI && selectedTrafo ? (
        chartData.length > 0 ? (
          <div
            className={`p-6 rounded-xl border shadow-lg flex flex-col ${cardBg}`}
          >
            <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
              <h3 className={`font-bold flex items-center gap-2 ${textMain}`}>
                <FileBarChart size={20} className="text-green-500" /> Grafik
                Konsentrasi
              </h3>
              <div className="flex flex-wrap gap-2">
                {GAS_CONFIG.map((gas) => (
                  <button
                    key={gas.key}
                    onClick={() => toggleSeries(gas.key)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      activeSeries[gas.key]
                        ? "bg-opacity-10 border-opacity-50"
                        : "opacity-50 grayscale border-transparent bg-gray-100 dark:bg-slate-800"
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
                    )}{" "}
                    {gas.key}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: "100%", height: "500px" }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
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
                      fontWeight: "bold",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {GAS_CONFIG.map(
                    (gas) =>
                      activeSeries[gas.key] &&
                      (gas.type === "area" ? (
                        <Area
                          key={gas.key}
                          type="monotone"
                          dataKey={gas.key}
                          stroke={gas.color}
                          fill={`url(#colorTDCG)`}
                          strokeWidth={2}
                        />
                      ) : (
                        <Line
                          key={gas.key}
                          type="monotone"
                          dataKey={gas.key}
                          stroke={gas.color}
                          strokeWidth={gas.strokeWidth || 2}
                          dot={false}
                          strokeDasharray={gas.dash}
                        />
                      ))
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-700">
            <AlertCircle size={48} className="mb-4 text-gray-400" />
            <p>Data kosong untuk trafo ini.</p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-50 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-700">
          <TrendingUp size={48} className="mb-4 text-gray-400" />
          <p>Pilih Gardu Induk & Trafo untuk memulai analisis.</p>
        </div>
      )}
    </div>
  );
};

export default TrendingPage;
