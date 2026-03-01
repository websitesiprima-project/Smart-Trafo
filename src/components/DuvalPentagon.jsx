import React from "react";

const DuvalPentagon = ({ h2, ch4, c2h6, c2h4, c2h2 }) => {
  const total = h2 + ch4 + c2h6 + c2h4 + c2h2;
  if (total === 0)
    return (
      <div className="flex items-center justify-center h-64 text-xs text-slate-500">
        Masukkan data gas untuk melihat Pentagon
      </div>
    );

  // Perhitungan Persentase
  const pH2 = (h2 / total) * 100;
  const pC2H6 = (c2h6 / total) * 100;
  const pCH4 = (ch4 / total) * 100;
  const pC2H4 = (c2h4 / total) * 100;
  const pC2H2 = (c2h2 / total) * 100;

  // Rumus Koordinat Centroid Duval
  // H2(0, 40), C2H6(-38, 12), CH4(-24, -32), C2H4(24, -32), C2H2(38, 12)
  // Perhitungan Weighted Average Vectors

  const rad = (deg) => (deg * Math.PI) / 180;

  // Titik Sumbu Gas (Scale approx 0.4 relative to 100%)
  const k = 0.4;
  const points = [
    { x: 0, y: pH2 * k }, // H2 (Top)
    { x: pC2H6 * k * Math.cos(rad(162)), y: pC2H6 * k * Math.sin(rad(162)) }, // C2H6
    { x: pCH4 * k * Math.cos(rad(234)), y: pCH4 * k * Math.sin(rad(234)) }, // CH4
    { x: pC2H4 * k * Math.cos(rad(306)), y: pC2H4 * k * Math.sin(rad(306)) }, // C2H4
    { x: pC2H2 * k * Math.cos(rad(18)), y: pC2H2 * k * Math.sin(rad(18)) }, // C2H2
  ];

  // Hitung Centroid Sederhana (Average Position)
  let Cx = 0,
    Cy = 0;
  points.forEach((p) => {
    Cx += p.x;
    Cy += p.y;
  });
  // Faktor koreksi untuk Duval Centroid
  Cx = Cx * 1.0;
  Cy = Cy * 1.0;

  // SVG Paths untuk Zona Duval Pentagon 1 (Approximation Coordinates)
  const zones = {
    PD: "M 0 33 L -1 33 L -1 24.5 L 0 24.5 Z",
    D1: "M 0 40 L 38 12 L 32 -6.1 L 4 16 L 0 1.5 L 0 40 Z",
    D2: "M 4 16 L 32 -6.1 L 24.3 -30 L 0 -3 L 0 1.5 Z",
    T3: "M 0 -3 L 24.3 -30 L 23.5 -32.4 L 1 -32.4 L -6 -4 Z",
    T2: "M -6 -4 L 1 -32.4 L -22.5 -32.4 Z",
    T1: "M -6 -4 L -22.5 -32.4 L -23.5 -32.4 L -35 3.1 L 0 1.5 L 0 -3 Z",
    S: "M 0 1.5 L -35 3.1 L -38 12.4 L 0 40 L 0 33 L -1 33 L -1 24.5 L 0 24.5 Z",
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-slate-700 w-full">
      <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">
        Duval Pentagon 1
      </h3>
      <svg viewBox="-45 -45 90 90" className="w-full h-64 overflow-visible">
        <g transform="scale(1, -1)">
          {/* Zona Warna */}
          <path
            d={zones.PD}
            fill="#d8b4fe"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* PD - Ungu */}
          <path
            d={zones.D1}
            fill="#93c5fd"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* D1 - Biru Muda */}
          <path
            d={zones.D2}
            fill="#fca5a5"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* D2 - Merah Muda */}
          <path
            d={zones.T3}
            fill="#fdba74"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* T3 - Orange */}
          <path
            d={zones.T2}
            fill="#fde047"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* T2 - Kuning */}
          <path
            d={zones.T1}
            fill="#fef08a"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* T1 - Kuning Muda */}
          <path
            d={zones.S}
            fill="#86efac"
            fillOpacity="0.4"
            stroke="white"
            strokeWidth="0.1"
          />{" "}
          {/* S - Hijau */}
          {/* Label Zona */}
          <g
            transform="scale(1, -1)"
            className="text-[3px] font-bold fill-slate-500 pointer-events-none"
          >
            <text x="-2" y="-28" fontSize="3">
              PD
            </text>
            <text x="15" y="-20" fontSize="3">
              D1
            </text>
            <text x="10" y="5" fontSize="3">
              D2
            </text>
            <text x="5" y="20" fontSize="3">
              T3
            </text>
            <text x="-10" y="20" fontSize="3">
              T2
            </text>
            <text x="-15" y="10" fontSize="3">
              T1
            </text>
            <text x="-15" y="-15" fontSize="3">
              S
            </text>
          </g>
          {/* Sumbu dan Label Gas */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="40"
            stroke="white"
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />
          <text
            x="-2"
            y="-42"
            transform="scale(1, -1)"
            fontSize="4"
            fill="white"
          >
            H2
          </text>
          <line
            x1="0"
            y1="0"
            x2={40 * Math.cos(rad(162))}
            y2={40 * Math.sin(rad(162))}
            stroke="white"
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />
          <text
            x="-42"
            y="-12"
            transform="scale(1, -1)"
            fontSize="4"
            fill="white"
          >
            C2H6
          </text>
          <line
            x1="0"
            y1="0"
            x2={40 * Math.cos(rad(234))}
            y2={40 * Math.sin(rad(234))}
            stroke="white"
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />
          <text
            x="-28"
            y="36"
            transform="scale(1, -1)"
            fontSize="4"
            fill="white"
          >
            CH4
          </text>
          <line
            x1="0"
            y1="0"
            x2={40 * Math.cos(rad(306))}
            y2={40 * Math.sin(rad(306))}
            stroke="white"
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />
          <text
            x="25"
            y="36"
            transform="scale(1, -1)"
            fontSize="4"
            fill="white"
          >
            C2H4
          </text>
          <line
            x1="0"
            y1="0"
            x2={40 * Math.cos(rad(18))}
            y2={40 * Math.sin(rad(18))}
            stroke="white"
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />
          <text
            x="40"
            y="-12"
            transform="scale(1, -1)"
            fontSize="4"
            fill="white"
          >
            C2H2
          </text>
          {/* Titik Hasil DGA */}
          <circle
            cx={Cx}
            cy={Cy}
            r="2"
            fill="red"
            stroke="white"
            strokeWidth="0.5"
            className="animate-pulse"
          />
        </g>
      </svg>
      <div className="mt-2 text-xs text-center text-slate-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        Titik Diagnosis
      </div>
    </div>
  );
};

export default DuvalPentagon;
