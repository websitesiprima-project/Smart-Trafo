import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ultgData, allGIs, trafoDatabase } from "../data/assetData";
import {
  Map as MapIcon,
  Zap,
  AlertTriangle,
  Server,
  Activity,
  Flame,
  Trophy,
} from "lucide-react";

// --- 1. SETUP IKON ---
const createCustomIcon = (status) => {
  let iconUrl = "/markers/pin-normal.png";
  const s = (status || "").toString().toUpperCase();

  // PRIORITAS 1: MERAH (Kondisi 3, 4, Kritis)
  if (
    s.includes("COND 3") ||
    s.includes("COND 4") ||
    s.includes("KRITIS") ||
    s.includes("BAHAYA") ||
    s.includes("BURUK")
  ) {
    iconUrl = "/markers/pin-critical.gif";
  }
  // PRIORITAS 2: ORANGE (Kondisi 2, Waspada) - TAHAN DI SINI JANGAN SAMPAI JADI MERAH
  else if (
    s.includes("COND 2") ||
    s.includes("WASPADA") ||
    s.includes("WARNING")
  ) {
    iconUrl = "/markers/pin-warning2.gif";
  }
  // PRIORITAS 3: HIJAU
  else {
    iconUrl = "/markers/pin-normal.png";
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [60, 60],
    iconAnchor: [22, 60],
    popupAnchor: [0, -55],
    className: "custom-marker-img",
  });
};

const DashboardPage = ({ isDarkMode, liveData = [] }) => {
  const safeLiveData = Array.isArray(liveData) ? liveData : [];

  const totalStats = Object.values(ultgData).reduce(
    (acc, curr) => ({
      gi: acc.gi + curr.stats.gi,
      td: acc.td + curr.stats.td,
    }),
    { gi: 0, td: 0 }
  );

  // --- 2. LOGIKA PERINGKAT (DIPERBAIKI AGAR COND 2 TETAP ORANGE) ---
  const topTrafos = useMemo(() => {
    if (safeLiveData.length === 0) return [];

    const latestMap = new Map();
    safeLiveData.forEach((item) => {
      const key = `${(item.lokasi_gi || "").toUpperCase()}-${(
        item.nama_trafo || ""
      ).toUpperCase()}`;
      if (!latestMap.has(key) || item.id > latestMap.get(key).id) {
        latestMap.set(key, item);
      }
    });

    return Array.from(latestMap.values())
      .map((item) => ({
        gi: item.lokasi_gi,
        unit: item.nama_trafo,
        tdcg: parseFloat(item.tdcg) || parseFloat(item.tdcg_value) || 0,
        status: item.ieee_status || "Normal",
        id: item.id,
      }))
      .sort((a, b) => b.tdcg - a.tdcg)
      .slice(0, 5);
  }, [safeLiveData]);

  // --- 3. LOGIKA PIN PETA (FIX: PRIORITAS LABEL DI ATAS ANGKA) ---
  const getWorstCaseStatus = (giNameMap) => {
    const defaultRes = {
      status: "Normal",
      unit: "-",
      tdcg: 0,
      details: "Aman",
    };

    if (safeLiveData.length === 0 || !giNameMap) return defaultRes;

    const normalize = (str) =>
      (str || "").toUpperCase().replace(/\s+/g, " ").trim();
    const targetGI = normalize(giNameMap);

    const giRecords = safeLiveData.filter((d) => {
      const dbName = normalize(d.lokasi_gi);
      return dbName.includes(targetGI) || targetGI.includes(dbName);
    });

    if (giRecords.length === 0) return defaultRes;

    const uniqueUnitMap = new Map();
    giRecords.forEach((record) => {
      const unitName = normalize(record.nama_trafo);
      if (
        !uniqueUnitMap.has(unitName) ||
        record.id > uniqueUnitMap.get(unitName).id
      ) {
        uniqueUnitMap.set(unitName, record);
      }
    });

    const latestUnits = Array.from(uniqueUnitMap.values());

    // FUNGSI SKOR BARU (Strict Label Priority)
    const getSeverityScore = (record) => {
      const s = (record.ieee_status || "").toUpperCase();
      const gas = parseFloat(record.tdcg) || 0;

      // 1. MERAH MUTLAK (Hanya jika status tulisannya Kritis)
      if (s.includes("COND 3") || s.includes("KRITIS") || s.includes("BAHAYA"))
        return 3;

      // 2. ORANGE MUTLAK (Hanya jika status tulisannya Waspada/Cond 2)
      // KITA RETURN 2 DI SINI AGAR TIDAK LANJUT KE CEK GAS DI BAWAH
      if (s.includes("COND 2") || s.includes("WASPADA")) return 2;

      // 3. FALLBACK: Hanya jika status "NORMAL", baru kita curigai angkanya
      // Jika Normal tapi gas tinggi -> Anggap Merah/Orange
      if (gas >= 720) return 3;
      if (gas >= 300) return 2;

      return 1; // Hijau
    };

    latestUnits.sort((a, b) => {
      const scoreA = getSeverityScore(a);
      const scoreB = getSeverityScore(b);

      if (scoreA !== scoreB) return scoreB - scoreA;
      return (parseFloat(b.tdcg) || 0) - (parseFloat(a.tdcg) || 0);
    });

    const winner = latestUnits[0];

    // Final check untuk label display
    let finalStatus = winner.ieee_status || "Normal";
    const gas = parseFloat(winner.tdcg) || 0;

    // Override label HANYA jika status Normal tapi gas tinggi
    if (finalStatus.toUpperCase().includes("NORMAL")) {
      if (gas >= 720) finalStatus = "KRITIS (High Gas)";
      else if (gas >= 300) finalStatus = "WASPADA (High Gas)";
    }

    return {
      status: finalStatus,
      unit: winner.nama_trafo || "-",
      tdcg: gas,
      details: finalStatus,
    };
  };

  const textMain = isDarkMode ? "text-white" : "text-gray-900";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode
    ? "bg-[#1e293b] border-slate-700"
    : "bg-white border-slate-200";

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        .leaflet-popup { z-index: 2000; } 
        .leaflet-popup-content-wrapper { border-radius: 12px; overflow: hidden; padding: 0; }
        .leaflet-popup-content { margin: 0; width: 340px !important; }
      `}</style>

      {/* HEADER STATS */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${textMain}`}>
          Dashboard Monitoring Aset
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div
            className={`p-6 rounded-xl border shadow-sm flex items-center gap-5 ${cardBg} border-l-4 border-l-blue-500`}
          >
            <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
              <MapIcon size={32} />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${textSub}`}
              >
                Total Gardu Induk
              </p>
              <p className={`text-4xl font-black ${textMain}`}>
                {totalStats.gi}
              </p>
            </div>
          </div>
          <div
            className={`p-6 rounded-xl border shadow-sm flex items-center gap-5 ${cardBg} border-l-4 border-l-yellow-500`}
          >
            <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-500">
              <Zap size={32} />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${textSub}`}
              >
                Total Trafo Daya
              </p>
              <p className={`text-4xl font-black ${textMain}`}>
                {totalStats.td}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- MAP SECTION --- */}
        <div
          className={`lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden h-[600px] relative z-0 ${cardBg}`}
        >
          <MapContainer
            center={[0.8, 124.0]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; PLN UPT Manado"
              url={
                isDarkMode
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />

            {allGIs.map((gi, idx) => {
              const { status, unit, tdcg, details } = getWorstCaseStatus(
                gi.name
              );
              const trafoList = trafoDatabase[gi.name] || [];

              return (
                <Marker
                  key={idx}
                  position={[gi.lat, gi.lng]}
                  icon={createCustomIcon(status)}
                >
                  <Popup>
                    <div className="font-sans text-gray-800">
                      <div
                        className={`p-4 text-white ${
                          status.toUpperCase().includes("KRITIS") ||
                          status.toUpperCase().includes("COND 3")
                            ? "bg-red-600"
                            : status.toUpperCase().includes("WASPADA") ||
                              status.toUpperCase().includes("COND 2")
                            ? "bg-orange-500"
                            : "bg-blue-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Server size={18} />
                          <h3 className="font-bold text-lg m-0 leading-none">
                            {gi.name}
                          </h3>
                        </div>
                        <p className="text-[10px] m-0 opacity-80 font-mono">
                          Lat: {gi.lat.toFixed(4)}, Lng: {gi.lng.toFixed(4)}
                        </p>
                        <div className="mt-3 bg-black/20 px-3 py-1 rounded text-xs font-bold inline-block">
                          Status: {details}
                        </div>
                      </div>

                      {/* Notifikasi */}
                      {status.toUpperCase().includes("NORMAL") === false && (
                        <div className="bg-yellow-50 p-3 border-b border-yellow-100 text-xs text-gray-700">
                          <strong className="text-red-600 block mb-1">
                            ⚠️ Unit {unit}
                          </strong>
                          Terdeteksi {status} ({tdcg} ppm).
                        </div>
                      )}

                      <div className="bg-gray-50 max-h-[300px] overflow-y-auto p-3 space-y-3">
                        {trafoList.map((t, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border shadow-sm bg-white border-gray-200"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-blue-800 text-sm">
                                {t.name}
                              </span>
                              <span className="text-[9px] bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                                {t.merk}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500">
                              S/N: {t.sn}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* --- RANKING LIST (Kanan) --- */}
        <div
          className={`rounded-2xl border shadow-sm p-6 flex flex-col ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/10">
            <h3 className={`font-bold flex items-center gap-2 ${textMain}`}>
              <Trophy className="text-yellow-500" size={20} /> Input Terakhir
            </h3>
            <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded">
              Sorted by TDCG
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {topTrafos.map((item, idx) => {
              let barColor = "bg-green-500";
              let textColor = "text-green-600";

              const s = (item.status || "Normal").toString().toUpperCase();

              // LOGIKA WARNA LIST: Utamakan Label Status!
              // 1. Label Merah
              if (s.includes("COND 3") || s.includes("KRITIS")) {
                barColor = "bg-red-600";
                textColor = "text-red-600";
              }
              // 2. Label Orange
              else if (s.includes("COND 2") || s.includes("WASPADA")) {
                barColor = "bg-orange-500";
                textColor = "text-orange-600";
              }
              // 3. Fallback jika Label Normal tapi Gas Tinggi
              else if (item.tdcg >= 720) {
                barColor = "bg-red-600";
                textColor = "text-red-600";
              } else if (item.tdcg >= 300) {
                barColor = "bg-orange-500";
                textColor = "text-orange-600";
              }

              return (
                <div
                  key={idx}
                  className="group border-b border-gray-100 pb-2 last:border-0"
                >
                  <div className="flex justify-between items-end mb-1">
                    <div>
                      <p
                        className={`text-[10px] font-bold uppercase ${textSub}`}
                      >
                        {item.gi}
                      </p>
                      <p className={`text-sm font-bold ${textMain}`}>
                        {item.unit}
                      </p>
                      <p className={`text-[10px] ${textColor} font-bold`}>
                        {item.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-black ${textColor} flex items-center justify-end gap-1`}
                      >
                        <Flame size={14} /> {item.tdcg.toFixed(0)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${barColor}`}
                      style={{
                        width: `${Math.min((item.tdcg / 2000) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
