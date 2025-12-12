import React from "react";

const DuvalPentagon = ({ h2, ch4, c2h6, c2h4, c2h2 }) => {
  // 1. Hitung Total Gas
  const total = h2 + ch4 + c2h6 + c2h4 + c2h2;

  // Jika total 0, jangan render apa-apa (atau render kosong)
  if (total === 0) return null;

  // 2. Hitung Persentase Relatif
  const pH2 = (h2 / total) * 100;
  const pC2H6 = (c2h6 / total) * 100;
  const pCH4 = (ch4 / total) * 100;
  const pC2H4 = (c2h4 / total) * 100;
  const pC2H2 = (c2h2 / total) * 100;

  // 3. Konversi ke Koordinat Titik pada Sumbu (Skala: 1% = 1 unit koordinat)
  // Sudut Sumbu (H2=90deg, urutan CCW: H2, C2H6, CH4, C2H4, C2H2)
  // H2 (90)    : x = 0, y = val
  // C2H6 (162) : x = val * cos(162), y = val * sin(162)
  // CH4 (234)  : x = val * cos(234), y = val * sin(234)
  // C2H4 (306) : x = val * cos(306), y = val * sin(306)
  // C2H2 (18)  : x = val * cos(18), y = val * sin(18)

  const rad = (deg) => (deg * Math.PI) / 180;

  const points = [
    { x: 0, y: pH2 }, // H2
    { x: pC2H6 * Math.cos(rad(162)), y: pC2H6 * Math.sin(rad(162)) }, // C2H6
    { x: pCH4 * Math.cos(rad(234)), y: pCH4 * Math.sin(rad(234)) }, // CH4
    { x: pC2H4 * Math.cos(rad(306)), y: pC2H4 * Math.sin(rad(306)) }, // C2H4
    { x: pC2H2 * Math.cos(rad(18)), y: pC2H2 * Math.sin(rad(18)) }, // C2H2
  ];

  // 4. Hitung Centroid (Titik Tengah Poligon)
  // Rumus Centroid Poligon: Cx = (1/6A) * sum((xi + xi+1) * (xi*yi+1 - xi+1*yi))
  let area = 0;
  let Cx = 0;
  let Cy = 0;

  for (let i = 0; i < 5; i++) {
    const x0 = points[i].x;
    const y0 = points[i].y;
    const x1 = points[(i + 1) % 5].x;
    const y1 = points[(i + 1) % 5].y;

    const cross = x0 * y1 - x1 * y0;
    area += cross;
    Cx += (x0 + x1) * cross;
    Cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  Cx = Cx / (6 * area);
  Cy = Cy / (6 * area);

  // Koordinat Boundaries (Sesuai IEEE C57.104-2019 Annex D)
  // Koordinat SVG perlu di-flip Y-nya karena SVG y-positif ke bawah.
  // Kita pakai transform scale(1, -1) di group utama agar logika kartesius tetap jalan.

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
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-slate-700">
      <h3 className="text-slate-300 text-sm font-bold mb-4">
        Duval Pentagon 1
      </h3>
      <svg viewBox="-45 -45 90 90" className="w-64 h-64 overflow-visible">
        <g transform="scale(1, -1)">
          {/* Gambar Zona */}
          <path
            d={zones.PD}
            fill="#a855f7"
            fillOpacity="0.3"
            stroke="#a855f7"
            strokeWidth="0.5"
          />
          <path
            d={zones.D1}
            fill="#3b82f6"
            fillOpacity="0.3"
            stroke="#3b82f6"
            strokeWidth="0.5"
          />
          <path
            d={zones.D2}
            fill="#ef4444"
            fillOpacity="0.3"
            stroke="#ef4444"
            strokeWidth="0.5"
          />
          <path
            d={zones.T3}
            fill="#f59e0b"
            fillOpacity="0.3"
            stroke="#f59e0b"
            strokeWidth="0.5"
          />
          <path
            d={zones.T2}
            fill="#fbbf24"
            fillOpacity="0.3"
            stroke="#fbbf24"
            strokeWidth="0.5"
          />
          <path
            d={zones.T1}
            fill="#fcd34d"
            fillOpacity="0.3"
            stroke="#fcd34d"
            strokeWidth="0.5"
          />
          <path
            d={zones.S}
            fill="#10b981"
            fillOpacity="0.3"
            stroke="#10b981"
            strokeWidth="0.5"
          />

          {/* Label Zona (Manual adjustment for position) */}
          <g
            transform="scale(1, -1)"
            className="text-[3px] font-bold fill-white pointer-events-none"
          >
            <text x="-2" y="-28" fontSize="3" fill="#fff">
              PD
            </text>
            <text x="15" y="-20" fontSize="3" fill="#fff">
              D1
            </text>
            <text x="10" y="5" fontSize="3" fill="#fff">
              D2
            </text>
            <text x="5" y="20" fontSize="3" fill="#fff">
              T3
            </text>
            <text x="-10" y="20" fontSize="3" fill="#fff">
              T2
            </text>
            <text x="-15" y="10" fontSize="3" fill="#fff">
              T1
            </text>
            <text x="-15" y="-15" fontSize="3" fill="#fff">
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
            r="1.5"
            fill="red"
            stroke="white"
            strokeWidth="0.5"
            className="animate-pulse"
          />
        </g>
      </svg>
      <div className="mt-2 text-xs text-center text-slate-400">
        <span className="text-red-400 font-bold">●</span> Titik Diagnosis
      </div>
    </div>
  );
};

export default DuvalPentagon;
