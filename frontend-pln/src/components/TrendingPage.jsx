import React, { useState } from "react";
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
import { allGIs, trafoDatabase, historicalDGA } from "../data/assetdata";
import { TrendingUp, Filter } from "lucide-react";

const TrendingPage = ({ isDarkMode }) => {
  const [selectedGI, setSelectedGI] = useState(allGIs[0]?.name || "");
  const [selectedTrafo, setSelectedTrafo] = useState("");

  // Kunci data history: "NAMA GI - NAMA TRAFO"
  const dataKey = `${selectedGI} - ${selectedTrafo}`;
  const chartData = historicalDGA[dataKey] || [];

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <div className="flex justify-between items-center border-b pb-4 border-gray-200/20">
        <div>
          <h2
            className={`text-2xl font-bold flex items-center gap-2 ${
              isDarkMode ? "text-white" : "text-blue-900"
            }`}
          >
            <TrendingUp /> Analisis Trending Gas (TDCG)
          </h2>
          <p className="text-sm text-gray-500">
            Monitoring kenaikan gas terlarut dari waktu ke waktu.
          </p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div
        className={`p-6 rounded-xl border shadow-sm ${
          isDarkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-4 font-bold text-xs uppercase opacity-60">
          <Filter size={14} /> Filter Aset
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Gardu Induk</label>
            <select
              className="w-full p-2 rounded border bg-gray-50 dark:bg-slate-900 dark:border-slate-600"
              value={selectedGI}
              onChange={(e) => {
                setSelectedGI(e.target.value);
                setSelectedTrafo("");
              }}
            >
              {allGIs.map((gi, i) => (
                <option key={i} value={gi.name}>
                  {gi.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Unit Trafo</label>
            <select
              className="w-full p-2 rounded border bg-gray-50 dark:bg-slate-900 dark:border-slate-600"
              value={selectedTrafo}
              onChange={(e) => setSelectedTrafo(e.target.value)}
              disabled={!selectedGI}
            >
              <option value="">-- Pilih Trafo --</option>
              {selectedGI &&
                trafoDatabase[selectedGI]?.map((t, i) => (
                  <option key={i} value={t.name}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* CHART AREA */}
      <div
        className={`p-6 rounded-xl border shadow-lg h-[500px] ${
          isDarkMode
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                stroke={isDarkMode ? "#cbd5e1" : "#475569"}
              />
              <YAxis stroke={isDarkMode ? "#cbd5e1" : "#475569"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? "#1e293b" : "#fff",
                  borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                }}
              />
              <Legend />
              {/* Garis tiap gas */}
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
                strokeWidth={3}
              />{" "}
              {/* Merah Tebal untuk Acetylene (Bahaya) */}
              <Line
                type="monotone"
                dataKey="TDCG"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
            <TrendingUp size={48} className="mb-2" />
            <p>Pilih Trafo di atas untuk melihat grafik trending.</p>
            <p className="text-xs">
              (Pastikan data historis tersedia di assetData.js)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingPage;
