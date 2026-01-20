import React, { useState, useMemo } from "react";
import {
  Trash2,
  Search,
  FileText,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Loader2,
  Filter,
  Download,
  CheckSquare,
  Square,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  generatePDFFromTemplate,
  generatePDFBlob,
} from "../utils/PDFGenerator";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const HistoryPage = ({
  historyData,
  isDarkMode,
  fetchHistory,
  loadingHistory,
  onDeleteAll,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State untuk mode seleksi batch
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- 1. FILTER TAHUN & PENCARIAN ---
  const filteredData = useMemo(() => {
    return historyData.filter((item) => {
      // Filter Text
      const term = searchTerm.toLowerCase();
      const matchText =
        (item.nama_trafo || "").toLowerCase().includes(term) ||
        (item.lokasi_gi || "").toLowerCase().includes(term);

      // Filter Tahun
      const itemYear = item.tanggal_sampling
        ? item.tanggal_sampling.split("-")[0]
        : "";
      const matchYear = selectedYear === "All" || itemYear === selectedYear;

      return matchText && matchYear;
    });
  }, [historyData, searchTerm, selectedYear]);

  // List Tahun Unik dari Data
  const availableYears = useMemo(() => {
    const years = new Set(
      historyData.map((i) => i.tanggal_sampling?.split("-")[0]).filter(Boolean),
    );
    ["2022", "2023", "2024", "2025", "2026"].forEach((y) => years.add(y));
    return Array.from(years).sort().reverse();
  }, [historyData]);

  // --- 2. HAPUS SATU ---
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus data ini?")) return;
    try {
      await fetch(`http://127.0.0.1:8000/history/${id}`, { method: "DELETE" });
      toast.success("Terhapus");
      fetchHistory();
    } catch {
      toast.error("Gagal hapus");
    }
  };

  // --- 3. HAPUS SEMUA ---
  const handleClearAll = async () => {
    if (historyData.length === 0) {
      toast.info("Data kosong.");
      return;
    }
    onDeleteAll();
  };

  // --- 4. FUNGSI SELEKSI BATCH ---
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds([]); // Reset selection saat toggle
  };

  const toggleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item.id));
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 data untuk didownload.");
      return;
    }

    // Jika hanya 1 file, download langsung
    if (selectedIds.length === 1) {
      const item = historyData.find((d) => d.id === selectedIds[0]);
      if (item) {
        try {
          await generatePDFFromTemplate(item);
          toast.success("PDF berhasil diunduh.");
        } catch (error) {
          toast.error("Gagal mengunduh PDF.");
        }
      }
      setSelectedIds([]);
      setSelectionMode(false);
      return;
    }

    // Jika lebih dari 1 file, buat ZIP
    toast.info(`Membuat ZIP untuk ${selectedIds.length} file PDF...`);

    const zip = new JSZip();
    let successCount = 0;

    for (const id of selectedIds) {
      const item = historyData.find((d) => d.id === id);
      if (item) {
        try {
          const pdfBlob = await generatePDFBlob(item);
          const filename =
            `Laporan_DGA_${item.nama_trafo}_${item.tanggal_sampling}.pdf`.replace(
              /[^a-z0-9_.-]/gi,
              "_",
            );
          zip.file(filename, pdfBlob);
          successCount++;
        } catch (error) {
          console.error(`Failed to generate PDF for ID ${id}:`, error);
        }
      }
    }

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const timestamp = new Date().toISOString().split("T")[0];
      saveAs(zipBlob, `DGA_Reports_${timestamp}.zip`);
      toast.success(`Berhasil mengunduh ${successCount} file PDF dalam ZIP.`);
    } catch (error) {
      toast.error("Gagal membuat file ZIP.");
      console.error(error);
    }

    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 data untuk dihapus.");
      return;
    }

    if (!window.confirm(`Hapus ${selectedIds.length} data yang dipilih?`))
      return;

    setIsDeleting(true);
    let count = 0;

    for (const id of selectedIds) {
      try {
        await fetch(`http://127.0.0.1:8000/history/${id}`, {
          method: "DELETE",
          keepalive: true,
        });
        count++;
      } catch (e) {
        console.error(e);
      }
    }

    toast.success(`Berhasil menghapus ${count} data.`);
    fetchHistory();
    setSelectedIds([]);
    setSelectionMode(false);
    setIsDeleting(false);
  };

  // Styles dengan Logika Eksplisit (Bukan dark:modifier)
  const thClass = `px-6 py-4 text-left text-xs font-bold uppercase ${
    isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-600"
  }`;
  const tdClass = `px-6 py-4 border-b ${
    isDarkMode ? "border-slate-700" : "border-gray-100"
  }`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b pb-6 border-gray-200/50">
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
            Total: {filteredData.length} / {historyData.length} Data
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* FILTER TAHUN */}
          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`pl-10 pr-4 py-2 rounded-lg border text-sm font-bold outline-none cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="All">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 rounded-lg border text-sm outline-none ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
          </div>

          {/* BUTTONS */}
          {!selectionMode ? (
            <>
              <button
                onClick={toggleSelectionMode}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                <CheckSquare size={16} />
                <span className="hidden md:inline">Seleksi</span>
              </button>
              <button
                onClick={handleClearAll}
                disabled={isDeleting || historyData.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                <span className="hidden md:inline">Hapus Semua</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBatchDownload}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Download size={16} />
                Download ({selectedIds.length})
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.length === 0 || isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                Hapus ({selectedIds.length})
              </button>
              <button
                onClick={toggleSelectionMode}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                <X size={16} />
                Batal
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
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
                {selectionMode && (
                  <th
                    className={`text-center ${thClass}`}
                    style={{ width: "50px" }}
                  >
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-full"
                    >
                      {selectedIds.length === filteredData.length &&
                      filteredData.length > 0 ? (
                        <CheckSquare size={18} className="text-blue-500" />
                      ) : (
                        <Square size={18} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className={thClass}>Tanggal</th>
                <th className={thClass}>Identitas</th>
                <th className={thClass}>Status</th>
                <th className={`text-center ${thClass}`}>TDCG</th>
                {!selectionMode && (
                  <th className={`text-center ${thClass}`}>Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td
                    colSpan={selectionMode ? "6" : "5"}
                    className="p-8 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectionMode ? "6" : "5"}
                    className="p-8 text-center text-gray-500"
                  >
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => selectionMode && toggleSelectItem(item.id)}
                    className={`${
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                    } ${
                      selectionMode && selectedIds.includes(item.id)
                        ? isDarkMode
                          ? "bg-blue-900/20"
                          : "bg-blue-50"
                        : ""
                    } ${selectionMode ? "cursor-pointer" : ""}`}
                  >
                    {selectionMode && (
                      <td className={`text-center ${tdClass}`}>
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="flex items-center justify-center w-full"
                        >
                          {selectedIds.includes(item.id) ? (
                            <CheckSquare size={18} className="text-blue-500" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className={tdClass}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Calendar size={14} className="text-[#1B7A8F]" />{" "}
                        {item.tanggal_sampling}
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        #{item.id}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div
                        className={`font-medium text-sm ${
                          isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {item.nama_trafo}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin size={12} /> {item.lokasi_gi}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          item.status_ieee?.includes("Normal")
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status_ieee?.includes("Normal") ? (
                          <CheckCircle size={10} />
                        ) : (
                          <AlertTriangle size={10} />
                        )}{" "}
                        {item.status_ieee}
                      </span>
                    </td>
                    <td
                      className={`text-center font-black text-lg ${tdClass} ${
                        item.tdcg > 720 ? "text-red-500" : "text-[#1B7A8F]"
                      }`}
                    >
                      {Math.round(item.tdcg)}
                    </td>
                    {!selectionMode && (
                      <td className={`text-center ${tdClass}`}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="p-2 text-blue-500 bg-blue-50 rounded hover:bg-blue-100"
                            title="Lihat Detail"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            onClick={() => generatePDFFromTemplate(item)}
                            className="p-2 text-green-500 bg-green-50 rounded hover:bg-green-100"
                            title="Cetak PDF"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-500 bg-red-50 rounded hover:bg-red-100"
                            title="Hapus Data"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === MODAL DETAIL TRAFO (PERBAIKAN WARNA TOTAL) === */}
      {selectedItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] 
            ${isDarkMode ? "bg-slate-800" : "bg-white"}
          `}
          >
            {/* Header Modal */}
            <div
              className={`flex justify-between items-center p-6 border-b flex-shrink-0
              ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-gray-100"
              }
            `}
            >
              <div>
                <h3
                  className={`text-xl font-bold flex items-center gap-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  <Zap className="text-yellow-500" /> Detail Pengujian
                </h3>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {selectedItem.nama_trafo} - {selectedItem.lokasi_gi}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className={`p-2 rounded-full transition ${
                  isDarkMode
                    ? "hover:bg-slate-700 text-white"
                    : "hover:bg-gray-100 text-gray-800"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Info Utama (Total Gas & Status) */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Kartu Total Gas */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-center
                  ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600"
                      : "bg-[#F0F9FA] border-[#1B7A8F]/30"
                  } 
                `}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDarkMode ? "text-blue-300" : "text-[#1B7A8F]"
                    }`}
                  >
                    Total Gas (TDCG)
                  </p>
                  <p
                    className={`text-3xl font-black mt-1 ${
                      isDarkMode ? "text-white" : "text-[#1B7A8F]"
                    }`}
                  >
                    {selectedItem.tdcg || 0}{" "}
                    <span className="text-sm font-normal opacity-70">ppm</span>
                  </p>
                </div>

                {/* Kartu Status IEEE */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-center
                  ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600"
                      : "bg-[#F0F9FA] border-[#1B7A8F]/30"
                  }
                `}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDarkMode ? "text-blue-300" : "text-[#1B7A8F]"
                    }`}
                  >
                    Status IEEE
                  </p>
                  <p
                    className={`text-xl font-bold mt-2 ${
                      selectedItem.status_ieee?.includes("Normal")
                        ? isDarkMode
                          ? "text-green-400"
                          : "text-green-600"
                        : isDarkMode
                          ? "text-red-400"
                          : "text-red-600"
                    }`}
                  >
                    {selectedItem.status_ieee || "Unknown"}
                  </p>
                </div>
              </div>

              <h4
                className={`font-bold mb-4 pb-2 border-b flex items-center gap-2
                ${
                  isDarkMode
                    ? "text-gray-200 border-slate-700"
                    : "text-gray-700 border-gray-100"
                }
              `}
              >
                <FileText size={16} /> Komposisi Gas Terlarut
              </h4>

              {/* Grid Gas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map(
                  (gas) => (
                    <div
                      key={gas}
                      className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-colors
                      ${
                        isDarkMode
                          ? "bg-slate-700 border-slate-600"
                          : "bg-white border-gray-200"
                      }
                    `}
                    >
                      <span
                        className={`uppercase text-xs font-bold mb-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {gas}
                      </span>
                      <span
                        className={`font-mono text-lg font-bold ${
                          isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {selectedItem[gas]}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className={`p-5 flex justify-end gap-3 border-t flex-shrink-0
              ${
                isDarkMode
                  ? "bg-slate-900 border-slate-700"
                  : "bg-gray-50 border-gray-100"
              }
            `}
            >
              <button
                onClick={() => generatePDFFromTemplate(selectedItem)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Download size={18} /> Download Laporan PDF
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className={`px-5 py-2.5 border rounded-lg text-sm font-bold transition-all
                  ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
