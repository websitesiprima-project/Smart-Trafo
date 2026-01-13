import React from "react";

const DuvalTriangle = ({ ch4 = 0, c2h4 = 0, c2h2 = 0 }) => {
  // --- KONFIGURASI UKURAN ---
  const size = 280; // Ukuran sisi segitiga
  const height = (size * Math.sqrt(3)) / 2;
  const padding = 30; // Padding agar label tidak terpotong

  // Koordinat Titik Sudut (Relatif terhadap padding)
  // A = Top (CH4)
  // B = Left (C2H2)
  // C = Right (C2H4)
  const A = { x: size / 2 + padding, y: padding };
  const B = { x: padding, y: height + padding };
  const C = { x: size + padding, y: height + padding };

  // --- HELPER: Konversi Persentase ke Koordinat SVG ---
  const getCoord = (pCH4, pC2H2, pC2H4) => {
    // Normalisasi ke 0-1
    const total = pCH4 + pC2H2 + pC2H4 || 1;
    const a = pCH4 / total;
    const b = pC2H2 / total;
    const c = pC2H4 / total;

    return {
      x: a * A.x + b * B.x + c * C.x,
      y: a * A.y + b * B.y + c * C.y,
    };
  };

  // Hitung posisi titik data user
  const dataPoint = getCoord(ch4, c2h2, c2h4);

  // --- HELPER: Membuat Garis Grid ---
  // level: 0.2 (20%), 0.4, dst.
  const renderGridLine = (level) => {
    // Garis horizontal (CH4 constant - tidak dipakai di ternary standar biasanya, tapi ini untuk referensi visual)
    // Kita pakai standar garis sejajar sisi

    // Garis sejajar alas (CH4 constant)
    const p1 = getCoord(level, 1 - level, 0);
    const p2 = getCoord(level, 0, 1 - level);

    // Garis sejajar sisi kanan (C2H2 constant)
    const p3 = getCoord(0, level, 1 - level);
    const p4 = getCoord(1 - level, level, 0);

    // Garis sejajar sisi kiri (C2H4 constant)
    const p5 = getCoord(0, 1 - level, level);
    const p6 = getCoord(1 - level, 0, level);

    return (
      <g
        key={level}
        stroke="#94a3b8"
        strokeWidth="0.5"
        strokeDasharray="3 3"
        opacity="0.3"
      >
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
        <line x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} />
        <line x1={p5.x} y1={p5.y} x2={p6.x} y2={p6.y} />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative">
        <svg
          width={size + padding * 2}
          height={height + padding * 2}
          viewBox={`0 0 ${size + padding * 2} ${height + padding * 2}`}
        >
          {/* 1. BACKGROUND & GRID */}
          <polygon
            points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
            fill="none" // Transparan agar tidak blok
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          {[0.2, 0.4, 0.6, 0.8].map((l) => renderGridLine(l))}

          {/* 2. LABEL ZONA REFERENSI (Posisi Perkiraan untuk Konteks) */}
          <g className="text-[10px] font-bold fill-slate-400 opacity-60">
            {/* PD: Dekat Puncak */}
            <text x={A.x} y={A.y + 40} textAnchor="middle">
              PD
            </text>
            {/* T1, T2, T3: Sisi Kanan */}
            <text x={C.x - 40} y={C.y - 60} textAnchor="middle">
              T1
            </text>
            <text x={C.x - 20} y={C.y - 20} textAnchor="middle">
              T2/T3
            </text>
            {/* D1, D2: Sisi Kiri */}
            <text x={B.x + 40} y={B.y - 60} textAnchor="middle">
              D1
            </text>
            <text x={B.x + 20} y={B.y - 20} textAnchor="middle">
              D2
            </text>
            {/* DT: Tengah */}
            <text
              x={size / 2 + padding}
              y={height / 2 + padding + 10}
              textAnchor="middle"
            >
              DT
            </text>
          </g>

          {/* 3. LABEL SUDUT (GAS UTAMA) */}
          <text
            x={A.x}
            y={A.y - 10}
            textAnchor="middle"
            fill="#06b6d4"
            fontSize="12"
            fontWeight="bold"
          >
            CH4
          </text>
          <text
            x={B.x - 10}
            y={B.y + 10}
            textAnchor="end"
            fill="#f59e0b"
            fontSize="12"
            fontWeight="bold"
          >
            C2H2
          </text>
          <text
            x={C.x + 10}
            y={C.y + 10}
            textAnchor="start"
            fill="#ef4444"
            fontSize="12"
            fontWeight="bold"
          >
            C2H4
          </text>

          {/* 4. TITIK DATA USER */}
          {/* Glow effect */}
          <circle
            cx={dataPoint.x}
            cy={dataPoint.y}
            r="8"
            fill="#ef4444"
            opacity="0.3"
            className="animate-ping"
          />
          {/* Main Dot */}
          <circle
            cx={dataPoint.x}
            cy={dataPoint.y}
            r="5"
            fill="#ef4444"
            stroke="white"
            strokeWidth="2"
          />

          {/* Label "Anda di sini" */}
          <text
            x={dataPoint.x + 10}
            y={dataPoint.y}
            fill="#ef4444"
            fontSize="10"
            fontWeight="bold"
            style={{ textShadow: "1px 1px 0 #fff" }}
          >
            Anda di sini
          </text>
        </svg>
      </div>

      {/* LEGEND PERSENTASE DI BAWAH */}
      <div className="flex gap-4 text-[10px] mt-[-10px] bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
          <span className="text-slate-500 dark:text-slate-300">
            CH4: <b>{ch4}%</b>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span className="text-slate-500 dark:text-slate-300">
            C2H2: <b>{c2h2}%</b>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-slate-500 dark:text-slate-300">
            C2H4: <b>{c2h4}%</b>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DuvalTriangle;
