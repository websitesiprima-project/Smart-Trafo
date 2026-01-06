import React, { useState, useEffect } from "react";
import {
  ultgData,
  allGIs,
  trafoMapping,
  historicalDGA,
} from "../data/assetdata";
import GIMap from "./GIMap";
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
  LayoutDashboard,
  Zap,
  Activity,
  Map,
  Server,
  AlertCircle,
} from "lucide-react";

const DashboardPage = ({ isDarkMode }) => {
  // State untuk Pilihan Dropdown
  const [selectedGI, setSelectedGI] = useState(allGIs[0]?.name || ""); // Default GI pertama
  const [selectedTrafo, setSelectedTrafo] = useState(""); // Default kosong dulu
  const [chartData, setChartData] = useState([]);

  // Hitung Total Aset
  const totalStats = Object.values(ultgData).reduce(
    (acc, curr) => ({
      gi: acc.gi + curr.stats.gi,
      td: acc.td + curr.stats.td,
      tower: acc.tower + curr.stats.tower,
      kms: acc.kms + curr.stats.kms,
    }),
    { gi: 0, td: 0, tower: 0, kms: 0 }
  );

  // Efek: Saat GI berubah, otomatis pilih Trafo pertama dari GI tersebut
  useEffect(() => {
    if (selectedGI && trafoMapping[selectedGI]) {
      setSelectedTrafo(trafoMapping[selectedGI][0]); // Pilih trafo pertama otomatis
    } else {
      setSelectedTrafo("");
    }
  }, [selectedGI]);

  // Efek: Saat Trafo berubah, Ambil Data Riwayat
  useEffect(() => {
    if (selectedGI && selectedTrafo) {
      const key = `${selectedGI} - ${selectedTrafo}`; // Kunci: "GI MARISA - TD #1"
      const data = historicalDGA[key] || []; // Ambil data, kalau tidak ada return array kosong
      setChartData(data);
    }
  }, [selectedGI, selectedTrafo]);

  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";
  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-6 pb-10">
      {/* 1. HEADER & TOTAL SUMMARY */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${textMain}`}>
          Dashboard Aset UPT Manado
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Gardu Induk",
              val: totalStats.gi,
              icon: <Map className="text-blue-500" />,
            },
            {
              label: "Total Trafo Daya",
              val: totalStats.td,
              icon: <Zap className="text-yellow-500" />,
            },
            {
              label: "Total Tower",
              val: totalStats.tower,
              icon: <Server className="text-purple-500" />,
            },
            {
              label: "Transmisi (kms)",
              val: totalStats.kms.toFixed(2),
              icon: <Activity className="text-green-500" />,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 ${cardBg}`}
            >
              <div className="p-3 rounded-full bg-gray-100/10 border border-gray-100/20">
                {item.icon}
              </div>
              <div>
                <p className={`text-xs font-bold uppercase ${textSub}`}>
                  {item.label}
                </p>
                <p className={`text-2xl font-black ${textMain}`}>{item.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. ULTG BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(ultgData).map(([key, data]) => (
          <div
            key={key}
            className={`p-5 rounded-xl border shadow-sm ${cardBg} border-l-4 border-l-[#1B7A8F]`}
          >
            <h4 className={`font-bold text-lg mb-1 ${textMain}`}>
              {data.name}
            </h4>
            <p className="text-xs text-[#1B7A8F] font-semibold mb-4">
              Pusat: {data.center}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-100/10 pb-1">
                <span className={textSub}>Trafo Daya</span>
                <span className={`font-bold ${textMain}`}>
                  {data.stats.td} Unit
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. MAP & TRENDING CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PETA SEBARAN */}
        <div
          className={`lg:col-span-2 rounded-2xl border shadow-sm p-1 h-[500px] flex flex-col ${cardBg}`}
        >
          <div className="p-4 flex justify-between items-center">
            <h3 className={`font-bold ${textMain}`}>Peta Sebaran Aset</h3>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                Waspada
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>Kritis
              </span>
            </div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative z-0">
            <GIMap giList={allGIs} />
          </div>
        </div>

        {/* TRENDING GAS - DYNAMIC */}
        <div
          className={`rounded-2xl border shadow-sm p-6 flex flex-col ${cardBg}`}
        >
          <div className="mb-6 space-y-4">
            <div>
              <h3 className={`font-bold mb-1 ${textMain}`}>
                Trending Analisis Gas
              </h3>
              <p className={`text-xs ${textSub}`}>
                Pilih Gardu Induk & Trafo untuk melihat riwayat.
              </p>
            </div>

            {/* SELECTOR GI */}
            <div>
              <label className={`text-[10px] uppercase font-bold ${textSub}`}>
                Gardu Induk
              </label>
              <select
                value={selectedGI}
                onChange={(e) => setSelectedGI(e.target.value)}
                className={`w-full p-2 mt-1 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-[#1B7A8F] ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                {allGIs
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((gi, idx) => (
                    <option key={idx} value={gi.name}>
                      {gi.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* SELECTOR TRAFO */}
            <div>
              <label className={`text-[10px] uppercase font-bold ${textSub}`}>
                Unit Trafo
              </label>
              <select
                value={selectedTrafo}
                onChange={(e) => setSelectedTrafo(e.target.value)}
                disabled={!selectedGI}
                className={`w-full p-2 mt-1 rounded-lg border text-sm font-bold outline-none focus:ring-2 focus:ring-[#1B7A8F] ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                {selectedGI && trafoMapping[selectedGI] ? (
                  trafoMapping[selectedGI].map((t, idx) => (
                    <option key={idx} value={t}>
                      {t}
                    </option>
                  ))
                ) : (
                  <option>Tidak ada trafo</option>
                )}
              </select>
            </div>
          </div>

          {/* CHART AREA */}
          <div className="flex-1 min-h-[300px] relative">
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
                    fontSize={10}
                    tickFormatter={(val) => val.split("-")[0]}
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
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="H2"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="CH4"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="C2H6"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="C2H4"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="C2H2"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              // TAMPILAN JIKA TIDAK ADA DATA
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                <AlertCircle size={48} className="mb-2 text-gray-400" />
                <p className={`font-bold ${textMain}`}>
                  Data Riwayat Tidak Tersedia
                </p>
                <p className={`text-xs ${textSub}`}>
                  Belum ada data uji DGA yang diinput untuk trafo ini.
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
