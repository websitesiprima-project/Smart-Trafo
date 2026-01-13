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
  Filter,
  FileBarChart,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { allGIs, trafoDatabase } from "../data/assetData";

const TrendingPage = ({ isDarkMode, liveData = [] }) => {
  // Safe Fallbacks
  const safeGIs = allGIs || [];
  // Gunakan trafoDatabase langsung, atau fallback ke object kosong
  const safeTrafoDB = trafoDatabase || {};

  // --- STATE MANAGEMENT YANG DIPERBAIKI ---

  // 1. State GI (Default: GI pertama)
  const [selectedGI, setSelectedGI] = useState(safeGIs[0]?.name || "");

  // 2. State Trafo (Default: Trafo pertama dari GI pertama)
  // Inisialisasi langsung di sini agar tidak butuh useEffect saat load awal
  const [selectedTrafo, setSelectedTrafo] = useState(() => {
    const initialGI = safeGIs[0]?.name;
    if (initialGI && safeTrafoDB[initialGI]?.length > 0) {
      return safeTrafoDB[initialGI][0].name;
    }
    return "";
  });

  // --- HANDLER BARU (Pengganti useEffect) ---
  const handleGIChange = (e) => {
    const newGI = e.target.value;
    setSelectedGI(newGI);

    // Logika Auto-select Trafo dipindah ke sini
    if (newGI && safeTrafoDB[newGI]?.length > 0) {
      setSelectedTrafo(safeTrafoDB[newGI][0].name);
    } else {
      setSelectedTrafo("");
    }
  };

  // --- LOGIC: Calculate Chart Data (Tetap pakai useMemo) ---
  const chartData = useMemo(() => {
    if (
      !selectedGI ||
      !selectedTrafo ||
      !Array.isArray(liveData) ||
      liveData.length === 0
    ) {
      return [];
    }

    // 1. Filter Data
    const filtered = liveData.filter(
      (d) => d && d.lokasi_gi === selectedGI && d.nama_trafo === selectedTrafo
    );

    // 2. Map Data
    const mappedData = filtered.map((d) => ({
      date: d.tanggal_sampling || d.created_at || "N/A",
      H2: Number(d.h2 || 0),
      CH4: Number(d.ch4 || 0),
      C2H6: Number(d.c2h6 || 0),
      C2H4: Number(d.c2h4 || 0),
      C2H2: Number(d.c2h2 || 0),
      CO: Number(d.co || 0),
      CO2: Number(d.co2 || 0),
      TDCG: d.tdcg_value
        ? Number(d.tdcg_value)
        : Number(d.h2 || 0) +
          Number(d.ch4 || 0) +
          Number(d.c2h6 || 0) +
          Number(d.c2h4 || 0) +
          Number(d.c2h2 || 0) +
          Number(d.co || 0),
    }));

    // 3. Sort by Date
    return mappedData.sort((a, b) => new Date(a.date) - new Date(b.date));
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
            Monitoring 7 gas utama dan TDCG untuk mendeteksi anomali termal &
            elektrik.
          </p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className={`p-6 rounded-xl border shadow-sm ${cardBg}`}>
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-blue-500">
          <Filter size={16} /> Filter Aset
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DROPDOWN GI */}
          <div>
            <label className={`block text-xs font-bold mb-2 ${textSub}`}>
              Lokasi Gardu Induk
            </label>
            <div className="relative">
              <select
                value={selectedGI}
                onChange={handleGIChange} // <--- Gunakan Handler Baru
                className={`w-full p-3 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                {safeGIs.length > 0 ? (
                  safeGIs
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((gi, idx) => (
                      <option key={idx} value={gi.name}>
                        {gi.name}
                      </option>
                    ))
                ) : (
                  <option disabled>Memuat Data GI...</option>
                )}
              </select>
            </div>
          </div>

          {/* DROPDOWN TRAFO */}
          <div>
            <label className={`block text-xs font-bold mb-2 ${textSub}`}>
              Unit Trafo
            </label>
            <div className="relative">
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
                {selectedGI && safeTrafoDB[selectedGI]?.length > 0 ? (
                  safeTrafoDB[selectedGI].map((t, idx) => (
                    <option key={idx} value={t.name}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Data Trafo Kosong</option>
                )}
              </select>
            </div>
          </div>

          {/* INFO DATA POINT */}
          <div className="flex items-end pb-1">
            <div
              className={`w-full p-3 rounded-lg border flex items-center justify-between ${
                isDarkMode
                  ? "bg-slate-800 border-slate-600"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                <span className={`text-xs font-bold ${textSub}`}>
                  Total Data Point
                </span>
              </div>
              <span className={`text-lg font-black ${textMain}`}>
                {chartData.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHART SECTION */}
      <div
        className={`p-6 rounded-xl border shadow-lg h-[600px] flex flex-col ${cardBg}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-bold flex items-center gap-2 ${textMain}`}>
            <FileBarChart size={20} className="text-green-500" /> Grafik
            Konsentrasi Gas (ppm)
          </h3>
        </div>

        <div className="flex-1 w-full min-h-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
                  dataKey="date"
                  stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                  tick={{ fontSize: 12 }}
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
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />

                {/* GRAFIK */}
                <Area
                  type="monotone"
                  dataKey="TDCG"
                  stroke="#10b981"
                  fill="url(#colorTDCG)"
                  strokeWidth={2}
                  name="TDCG"
                />
                <Line
                  type="monotone"
                  dataKey="H2"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="H2"
                />
                <Line
                  type="monotone"
                  dataKey="CH4"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={false}
                  name="CH4"
                />
                <Line
                  type="monotone"
                  dataKey="C2H6"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  name="C2H6"
                />
                <Line
                  type="monotone"
                  dataKey="C2H4"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="C2H4"
                />
                <Line
                  type="monotone"
                  dataKey="C2H2"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="C2H2"
                />
                <Line
                  type="monotone"
                  dataKey="CO"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                  name="CO"
                />
                <Line
                  type="monotone"
                  dataKey="CO2"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                  name="CO2"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <AlertCircle size={48} className="text-gray-400" />
              </div>
              <h3 className={`text-xl font-bold ${textMain}`}>
                Data Riwayat Tidak Ditemukan
              </h3>
              <p className={`text-sm max-w-md mt-2 ${textSub}`}>
                Belum ada data uji DGA historis untuk{" "}
                <strong>{selectedTrafo}</strong> di{" "}
                <strong>{selectedGI}</strong>. Silakan input data baru pada menu
                &quot;Input Uji DGA&quot;.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;
