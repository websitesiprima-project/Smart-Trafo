import React, { useState } from "react";
import {
  Trash2,
  Search,
  FileText,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Info, // Import Ikon Info
  X, // Import Ikon Close
} from "lucide-react";

const HistoryPage = ({
  historyData,
  isDarkMode,
  fetchHistory,
  loadingHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // State untuk data yang sedang dilihat detailnya

  // 1. FILTER PENCARIAN
  const filteredData = historyData.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.nama_trafo?.toLowerCase().includes(term) ||
      item.lokasi_gi?.toLowerCase().includes(term) ||
      item.serial_number?.toLowerCase().includes(term) ||
      item.no_dokumen?.toLowerCase().includes(term)
    );
  });

  // 2. FUNGSI HAPUS DATA
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus data ini secara permanen?"))
      return;
    try {
      await fetch(`http://127.0.0.1:8000/history/${id}`, { method: "DELETE" });
      fetchHistory();
    } catch (error) {
      alert("Gagal menghapus data.");
    }
  };

  // STYLE HELPER
  const tableHeaderClass = `px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${
    isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-600"
  }`;

  const tableRowClass = `border-b transition-colors ${
    isDarkMode
      ? "border-slate-700 hover:bg-slate-800/50"
      : "border-gray-100 hover:bg-gray-50"
  }`;

  const textClass = isDarkMode ? "text-slate-300" : "text-gray-700";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6 border-gray-200/50">
        <div>
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-[#1B7A8F]"
            }`}
          >
            Arsip Data Pengujian
          </h2>
          <p
            className={`text-sm mt-1 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Database terintegrasi Supabase • Total: {historyData.length} Dokumen
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {/* Input Pencarian */}
          <div className="relative w-full md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari Trafo / GI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#1B7A8F] ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors no-print"
          >
            <FileText size={16} /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* TABEL DATA */}
      <div
        className={`rounded-xl shadow-sm border overflow-hidden ${
          isDarkMode
            ? "bg-[#1e293b] border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={tableHeaderClass}>Tanggal & Dokumen</th>
                <th className={tableHeaderClass}>Identitas Trafo</th>
                <th className={tableHeaderClass}>Hasil Analisis</th>
                <th className={`text-center ${tableHeaderClass}`}>TDCG</th>
                <th className={`text-center ${tableHeaderClass} no-print`}>
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200/50">
              {loadingHistory ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Mengambil data dari Cloud...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className={tableRowClass}>
                    {/* KOLOM 1: TANGGAL */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-[#1B7A8F]" />
                        <span
                          className={`font-bold text-sm ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {item.tanggal_sampling}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        #{item.id} • {item.no_dokumen || "-"}
                      </div>
                    </td>

                    {/* KOLOM 2: IDENTITAS */}
                    <td className="px-6 py-4">
                      <div className={`font-medium text-sm ${textClass}`}>
                        {item.nama_trafo}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin size={12} /> {item.lokasi_gi}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        S/N: {item.serial_number}
                      </div>
                    </td>

                    {/* KOLOM 3: HASIL DIAGNOSA */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            item.status_ieee?.includes("Normal")
                              ? "bg-green-100 text-green-700 border-green-200"
                              : item.status_ieee?.includes("KRITIS")
                              ? "bg-red-100 text-red-700 border-red-200"
                              : "bg-orange-100 text-orange-700 border-orange-200"
                          }`}
                        >
                          {item.status_ieee?.includes("Normal") ? (
                            <CheckCircle size={10} />
                          ) : (
                            <AlertTriangle size={10} />
                          )}
                          {item.status_ieee}
                        </div>
                        {item.diagnosa && (
                          <div
                            className={`text-xs ${textClass} opacity-80 max-w-[200px] truncate`}
                          >
                            {item.diagnosa.replace(/\|/g, " • ")}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* KOLOM 4: TDCG */}
                    <td className="px-6 py-4 text-center">
                      <div
                        className={`text-lg font-black ${
                          item.tdcg > 720 ? "text-red-500" : "text-[#1B7A8F]"
                        }`}
                      >
                        {Math.round(item.tdcg)}
                      </div>
                      <div className="text-[10px] text-gray-400">ppm</div>
                    </td>

                    {/* KOLOM 5: AKSI (INFO & DELETE) */}
                    <td className="px-6 py-4 text-center no-print">
                      <div className="flex items-center justify-center gap-2">
                        {/* TOMBOL INFO (BARU) */}
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          title="Lihat Detail Input Gas"
                        >
                          <Info size={18} />
                        </button>
                        {/* TOMBOL HAPUS */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus Data"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL / POPUP DETAIL (BARU) --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
              isDarkMode ? "bg-slate-800 text-white" : "bg-white text-gray-900"
            }`}
          >
            {/* Header Modal */}
            <div
              className={`px-6 py-4 border-b flex justify-between items-center ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <div>
                <h3 className="font-bold text-lg">Rincian Data Input</h3>
                <p className="text-xs opacity-60">
                  ID: #{selectedItem.id} • {selectedItem.tanggal_sampling}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Modal (Nilai Gas) */}
            <div className="p-6 space-y-4">
              {/* Identitas Singkat */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="block opacity-50 uppercase font-bold">
                      Lokasi / GI
                    </span>
                    <span className="font-semibold">
                      {selectedItem.lokasi_gi}
                    </span>
                  </div>
                  <div>
                    <span className="block opacity-50 uppercase font-bold">
                      Nama Trafo
                    </span>
                    <span className="font-semibold">
                      {selectedItem.nama_trafo}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Nilai Gas */}
              <div>
                <h4 className="text-xs font-bold uppercase opacity-50 mb-3 text-center">
                  Konsentrasi Gas Terlarut (PPM)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: "H2 (Hidrogen)", v: selectedItem.h2 },
                    { l: "CH4 (Metana)", v: selectedItem.ch4 },
                    { l: "C2H2 (Asetilen)", v: selectedItem.c2h2 },
                    { l: "C2H4 (Etilen)", v: selectedItem.c2h4 },
                    { l: "C2H6 (Etana)", v: selectedItem.c2h6 },
                    { l: "CO (Karbon Mono)", v: selectedItem.co },
                    { l: "CO2 (Karbon Dio)", v: selectedItem.co2 },
                    {
                      l: "TDCG (Total)",
                      v: Math.round(selectedItem.tdcg),
                      highlight: true,
                    },
                  ].map((gas, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between items-center p-2 rounded border ${
                        gas.highlight
                          ? isDarkMode
                            ? "bg-blue-900/30 border-blue-700"
                            : "bg-blue-50 border-blue-200"
                          : isDarkMode
                          ? "bg-slate-700/50 border-slate-600"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <span className="text-xs font-medium opacity-70">
                        {gas.l}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          gas.highlight ? "text-blue-500" : ""
                        }`}
                      >
                        {gas.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div
              className={`px-6 py-4 border-t text-center ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold text-sm transition-colors"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
