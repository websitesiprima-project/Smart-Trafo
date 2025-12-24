import React from "react";
import { Trash2, FileText, Calendar, MapPin, Download } from "lucide-react";
import { toast } from "sonner";

const HistoryPage = ({
  historyData,
  isDarkMode,
  fetchHistory,
  loadingHistory,
}) => {
  // 1. FUNGSI HAPUS DATA
  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus data ini? Data tidak bisa dikembalikan.")) return;
    try {
      await fetch(`http://127.0.0.1:8000/history/${id}`, { method: "DELETE" });
      toast.success("Data berhasil dihapus dari arsip.");
      fetchHistory();
    } catch (error) {
      console.error("Gagal hapus", error);
      toast.error("Gagal menghapus data.");
    }
  };

  // 2. FUNGSI DOWNLOAD CSV (EXCEL)
  const downloadCSV = () => {
    if (historyData.length === 0) {
      toast.warning("Tidak ada data untuk diunduh.");
      return;
    }

    // Header Kolom untuk Excel
    const headers = [
      "No Dokumen",
      "Lokasi/GI",
      "Nama Trafo",
      "Merk",
      "S/N",
      "Tanggal Sampling",
      "Suhu (°C)",
      "Petugas",
      "H2",
      "CH4",
      "C2H2",
      "C2H4",
      "C2H6",
      "CO",
      "CO2",
      "TDCG",
      "Status IEEE",
      "Diagnosa",
      "Rekomendasi Volty",
    ];

    // Mapping Data ke Baris CSV
    const rows = historyData.map((item) => [
      `"${item.no_dokumen || "-"}"`,
      `"${item.lokasi_gi || "-"}"`,
      `"${item.nama_trafo || "-"}"`,
      `"${item.merk_trafo || "-"}"`,
      `"${item.serial_number || "-"}"`,
      `"${item.tanggal_sampling || "-"}"`,
      item.suhu_sampel || 0,
      `"${item.diambil_oleh || "-"}"`,
      item.h2,
      item.ch4,
      item.c2h2,
      item.c2h4,
      item.c2h6,
      item.co,
      item.co2,
      item.tdcg,
      `"${item.status_ieee}"`,
      `"${item.diagnosa}"`,
      `"${item.hasil_ai}"`, // Ini adalah chat naratif Volty
    ]);

    // Menggabungkan Header dan Baris
    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    // Membuat Blob dan Link Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Laporan_DGA_PLN_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan berhasil diunduh!");
  };

  if (loadingHistory) {
    return (
      <div className="text-center p-10 opacity-50 animate-pulse">
        Sedang mengambil data arsip...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
        <div>
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-[#1B7A8F]"
            }`}
          >
            Arsip Pengujian
          </h2>
          <p
            className={`text-sm ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Database riwayat data DGA Trafo UPT Manado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
            Total Data: {historyData.length}
          </div>

          {/* TOMBOL DOWNLOAD CSV */}
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B7A8F] hover:bg-[#135d6e] text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
        <table
          className={`w-full text-sm text-left ${
            isDarkMode
              ? "text-slate-300 bg-[#1e293b]"
              : "text-gray-600 bg-white"
          }`}
        >
          <thead
            className={`text-xs uppercase ${
              isDarkMode
                ? "bg-slate-900 text-slate-400"
                : "bg-gray-50 text-gray-700"
            }`}
          >
            <tr>
              <th className="px-6 py-4">Trafo / Lokasi</th>
              <th className="px-6 py-4">Tanggal Sampling</th>
              <th className="px-6 py-4 text-center">TDCG (ppm)</th>
              <th className="px-6 py-4">Status IEEE 2019</th>
              <th className="px-6 py-4">Diagnosa AI</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((item) => (
              <tr
                key={item.id}
                className={`border-b hover:bg-opacity-50 transition-colors ${
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800"
                    : "border-gray-100 hover:bg-blue-50"
                }`}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-base mb-0.5 text-[#1B7A8F]">
                    {item.nama_trafo}
                  </div>
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <MapPin size={10} /> {item.lokasi_gi}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="opacity-50" />
                    {item.tanggal_sampling || "-"}
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    Suhu: {item.suhu_sampel}°C
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded font-mono font-bold ${
                      item.tdcg > 720
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.tdcg ? item.tdcg.toFixed(0) : 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status_ieee && item.status_ieee.includes("Normal")
                        ? "bg-green-100 text-green-800"
                        : item.status_ieee &&
                          item.status_ieee.includes("KRITIS")
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {item.status_ieee || "N/A"}
                  </span>
                </td>
                <td
                  className="px-6 py-4 max-w-xs truncate text-xs italic opacity-80"
                  title={item.hasil_ai}
                >
                  "{item.hasil_ai}"
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-all"
                    title="Hapus Data"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {historyData.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-10 opacity-50 italic">
                  Belum ada data pengujian tersimpan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPage;
