import React from "react";
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

const TrendChart = ({ data, isDarkMode }) => {
  // Validasi Data
  if (!data || data.length === 0)
    return (
      <div className="h-64 flex items-center justify-center opacity-50 text-sm border rounded-xl bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
        Pilih ID Trafo di tabel untuk melihat tren grafik.
      </div>
    );

  // Urutkan data berdasarkan tanggal (Lama -> Baru)
  const sortedData = [...data].sort(
    (a, b) => new Date(a.tanggal) - new Date(b.tanggal)
  );

  return (
    <div
      className={`p-4 rounded-xl border shadow-lg mb-6 transition-all ${
        isDarkMode
          ? "bg-[#1e293b] border-slate-700"
          : "bg-white border-slate-200"
      }`}
    >
      <h3 className="text-sm font-bold uppercase mb-4 text-[#1B7A8F] tracking-widest">
        📈 Tren Kenaikan Gas (Gassing Rate)
      </h3>

      {/* PENYELESAIAN ERROR HEIGHT: Class h-[300px] sudah benar disini */}
      <div className="h-[300px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="tanggal"
              stroke={isDarkMode ? "#94a3b8" : "#64748b"}
              tickFormatter={(t) => t.split(" ")[0]}
            />
            <YAxis stroke={isDarkMode ? "#94a3b8" : "#64748b"} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#0f172a" : "#fff",
                borderRadius: "8px",
                border: isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0",
              }}
            />
            <Legend />

            {/* PENYELESAIAN ERROR RX <ellipse>:
                Tambahkan prop isAnimationActive={false} pada setiap Line.
                Ini mencegah Recharts mencoba menganimasikan dot sebelum ukurannya siap.
            */}
            <Line
              type="monotone"
              dataKey="h2"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false} // <-- ANTI ERROR RX
              name="H2"
            />
            <Line
              type="monotone"
              dataKey="ch4"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false} // <-- ANTI ERROR RX
              name="CH4"
            />
            <Line
              type="monotone"
              dataKey="c2h2"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4 }}
              isAnimationActive={false} // <-- ANTI ERROR RX
              name="C2H2 (Bahaya)"
            />
            <Line
              type="monotone"
              dataKey="co"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false} // <-- ANTI ERROR RX
              name="CO"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
