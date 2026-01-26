import React, { useState, useMemo, useEffect } from "react";
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  generatePDFFromTemplate,
  generatePDFBlob,
} from "../utils/PDFGenerator";
import DuvalPentagon from "./DuvalPentagon";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// --- 1. DEFINISI MAPPING (WAJIB ADA) ---
const ULTG_MAPPING = {
  Lopana: [
    "GI Lopana",
    "GI Amurang",
    "GI Tumpaan",
    "GI Motoling",
    "GI Ratahan",
    "Lopana",
    "Amurang",
  ],
  Sawangan: [
    "GI Sawangan",
    "GI Teling",
    "GI Bitung",
    "GI Likupang",
    "GI Likupang New",
    "GI Paniki",
    "GI Tanjung Merah",
  ],
  Kotamobagu: ["GI Kotamobagu", "GI Lolak", "GI Boroko", "GI Otam"],
  Gorontalo: [
    "GI Gorontalo",
    "GI Isimu",
    "GI Marisa",
    "GI Botupingge",
    "GI Kwandang",
  ],
};

const HistoryPage = ({
  historyData,
  isDarkMode,
  fetchHistory,
  loadingHistory,
  onDeleteAll,
  // 🔥 WAJIB: Terima Props Role & Unit dari App.js
  userRole,
  userUnit,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortTdcg, setSortTdcg] = useState("default");

  // State Batch
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- 2. FILTER LOGIC (DIPERBAIKI) ---
  const filteredData = useMemo(() => {
    let baseData = historyData;

    // A. LOGIKA SECURITY: FILTER BERDASARKAN UNIT
    const isSuperAdmin = userRole === "super_admin" || !userUnit;

    if (!isSuperAdmin) {
      const allowedGIs = ULTG_MAPPING[userUnit] || [];
      baseData = historyData.filter((item) => {
        const itemGI = (item.lokasi_gi || "").trim();
        // Cek apakah GI item ini ada di daftar GI milik user
        return allowedGIs.some(
          (allowed) =>
            itemGI.toLowerCase().includes(allowed.toLowerCase()) ||
            allowed.toLowerCase().includes(itemGI.toLowerCase())
        );
      });
    }

    // B. LOGIKA SEARCH & FILTER (Perbaikan Syntax Error disini)
    // Sebelumnya baris .filter((item) => { hilang, makanya error
    let result = baseData.filter((item) => {
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

      // Filter Status
      let matchStatus = true;
      if (selectedStatus !== "All") {
        const status = (item.status_ieee || "").toLowerCase();
        if (selectedStatus === "1") {
          matchStatus =
            status.includes("kondisi 1") || status.includes("normal");
        } else if (selectedStatus === "2") {
          matchStatus =
            status.includes("kondisi 2") || status.includes("waspada");
        } else if (selectedStatus === "3") {
          matchStatus =
            status.includes("kondisi 3") ||
            status.includes("bahaya") ||
            status.includes("kritis");
        }
      }

      return matchText && matchYear && matchStatus;
    });

    // Sorting
    if (sortTdcg === "highest") {
      result = result.sort((a, b) => (b.tdcg || 0) - (a.tdcg || 0));
    } else if (sortTdcg === "lowest") {
      result = result.sort((a, b) => (a.tdcg || 0) - (b.tdcg || 0));
    }

    return result;
  }, [
    historyData,
    searchTerm,
    selectedYear,
    selectedStatus,
    sortTdcg,
    userRole,
    userUnit,
  ]);

  // Pagination Calculation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear, selectedStatus, sortTdcg]);

  const availableYears = useMemo(() => {
    const years = new Set(
      historyData.map((i) => i.tanggal_sampling?.split("-")[0]).filter(Boolean)
    );
    ["2023", "2024", "2025", "2026"].forEach((y) => years.add(y));
    return Array.from(years).sort().reverse();
  }, [historyData]);

  // --- HANDLERS ---
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

  const handleClearAll = async () => {
    if (historyData.length === 0) {
      toast.info("Data kosong.");
      return;
    }
    onDeleteAll();
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds([]);
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

    toast.info(`Membuat ZIP untuk ${selectedIds.length} file PDF...`);
    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const item = historyData.find((d) => d.id === id);
      if (!item) continue;

      try {
        const pdfBlob = await Promise.race([
          generatePDFBlob(item),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000)
          ),
        ]);

        if (pdfBlob) {
          const filename =
            `Laporan_DGA_${item.nama_trafo}_${item.tanggal_sampling}_${id}.pdf`.replace(
              /[^a-z0-9_.-]/gi,
              "_"
            );
          zip.file(filename, pdfBlob);
          successCount++;
        }

        if (i < selectedIds.length - 1)
          await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error(error);
      }
    }

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `DGA_Reports_Batch.zip`);
      toast.success(`${successCount} file berhasil diunduh.`);
    } catch (error) {
      toast.error("Gagal membuat ZIP.");
    }

    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 data.");
      return;
    }
    if (!window.confirm(`Hapus ${selectedIds.length} data terpilih?`)) return;

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
    toast.success(`Terhapus ${count} data.`);
    fetchHistory();
    setSelectedIds([]);
    setSelectionMode(false);
    setIsDeleting(false);
  };

  const thClass = `px-6 py-4 text-left text-xs font-bold uppercase ${
    isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-600"
  }`;
  const tdClass = `px-6 py-4 border-b ${
    isDarkMode ? "border-slate-700" : "border-gray-100"
  }`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* HEADER & FILTER */}
      <div className="space-y-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2
              className={`text-2xl font-bold ${
                isDarkMode ? "text-white" : "text-[#1B7A8F]"
              }`}
            >
              Arsip Data Pengujian {userUnit ? `(${userUnit})` : ""}
            </h2>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total: {filteredData.length} / {historyData.length} Data
            </p>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div
          className={`p-4 rounded-xl border ${
            isDarkMode
              ? "bg-slate-800/50 border-slate-700"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {/* Filter Row 1 */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {/* Filter Tahun */}
            <div className="relative flex-1 md:flex-none md:w-40">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium outline-none cursor-pointer ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
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

            {/* Filter TDCG */}
            <div className="relative flex-1 md:flex-none md:w-40">
              <ArrowUpDown
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={sortTdcg}
                onChange={(e) => setSortTdcg(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium outline-none cursor-pointer ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-white border-gray-300"
                }`}
              >
                <option value="default">Urutkan TDCG</option>
                <option value="highest">TDCG Tertinggi</option>
                <option value="lowest">TDCG Terendah</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="relative flex-1 md:flex-none md:w-40">
              <AlertTriangle
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium outline-none cursor-pointer ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-white border-gray-300"
                }`}
              >
                <option value="All">Semua Status</option>
                <option value="1">Normal</option>
                <option value="2">Waspada</option>
                <option value="3">Kritis</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Cari GI atau Trafo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none ${
                  isDarkMode
                    ? "bg-slate-900 border-slate-600 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
            </div>
          </div>

          {/* Filter Row 2: Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!selectionMode ? (
              <>
                <button
                  onClick={toggleSelectionMode}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <CheckSquare size={16} /> <span>Seleksi Batch</span>
                </button>
                {/* Tombol Hapus Semua hanya muncul jika Super Admin */}
                {userRole === "super_admin" && (
                  <button
                    onClick={handleClearAll}
                    disabled={isDeleting || historyData.length === 0}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}{" "}
                    <span>Hapus Semua</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleBatchDownload}
                  disabled={selectedIds.length === 0}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={16} /> Download ({selectedIds.length})
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedIds.length === 0 || isDeleting}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {isDeleting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}{" "}
                  <span>Hapus ({selectedIds.length})</span>
                </button>
                <button
                  onClick={toggleSelectionMode}
                  className="px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <X size={16} /> <span>Batal</span>
                </button>
              </>
            )}
          </div>
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
                <th className={thClass}>Status (IEEE C57.104)</th>
                <th className={`text-center ${thClass}`}>TDCG</th>
                {!selectionMode && (
                  <th className={`text-center ${thClass}`}>Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Data tidak ditemukan untuk unit ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
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
                      {(() => {
                        let bg = "";
                        let icon = null;
                        const status = (item.status_ieee || "").toLowerCase();
                        if (
                          status.includes("kondisi 1") ||
                          status.includes("normal")
                        ) {
                          bg = "bg-green-100 text-green-700";
                          icon = <CheckCircle size={10} />;
                        } else if (
                          status.includes("kondisi 2") ||
                          status.includes("waspada")
                        ) {
                          bg = "bg-orange-100 text-orange-700";
                          icon = <AlertTriangle size={10} />;
                        } else {
                          bg = "bg-red-100 text-red-700";
                          icon = <AlertTriangle size={10} />;
                        }
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${bg}`}
                          >
                            {icon} {item.status_ieee}
                          </span>
                        );
                      })()}
                    </td>
                    <td className={`text-center font-bold ${tdClass}`}>
                      {(() => {
                        const status = (item.status_ieee || "").toLowerCase();
                        let tdcgClass = "text-[#1B7A8F]";
                        if (
                          status.includes("kondisi 3") ||
                          status.includes("bahaya")
                        )
                          tdcgClass =
                            "bg-red-100 text-red-500 rounded-lg px-2 py-1";
                        else if (status.includes("kondisi 2"))
                          tdcgClass =
                            "bg-orange-100 text-orange-500 rounded-lg px-2 py-1";
                        else if (status.includes("kondisi 1"))
                          tdcgClass =
                            "bg-green-100 text-green-600 rounded-lg px-2 py-1";
                        return (
                          <span className={tdcgClass}>
                            {Math.round(item.tdcg)}
                          </span>
                        );
                      })()}
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
                            title="Hapus"
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

        {/* PAGINATION CONTROLS */}
        {filteredData.length > 0 && (
          <div
            className={`p-4 border-t flex items-center justify-between ${
              isDarkMode ? "border-slate-700" : "border-gray-200"
            }`}
          >
            <span
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              Halaman <strong>{currentPage}</strong> dari{" "}
              <strong>{totalPages}</strong> (Total {filteredData.length} data)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={`p-2 rounded hover:bg-gray-500/10 disabled:opacity-30 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className={`p-2 rounded hover:bg-gray-500/10 disabled:opacity-30 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETAIL */}
      {selectedItem && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            {/* Header Modal */}
            <div
              className={`flex justify-between items-center p-6 border-b ${
                isDarkMode ? "border-slate-700" : "border-gray-100"
              }`}
            >
              <div>
                <h3
                  className={`text-xl font-bold flex gap-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  <Zap className="text-yellow-500" /> Detail Pengujian
                </h3>
                <p className="text-sm opacity-60">
                  {selectedItem.nama_trafo} - {selectedItem.lokasi_gi}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-500/20 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Modal Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div
                  className={`p-4 rounded-xl border ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <p className="text-xs font-bold opacity-60 uppercase">
                    Total Gas (TDCG)
                  </p>
                  <p className="text-3xl font-black">
                    {selectedItem.tdcg || 0}{" "}
                    <span className="text-sm font-normal">ppm</span>
                  </p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    isDarkMode
                      ? "bg-slate-700 border-slate-600"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <p className="text-xs font-bold opacity-60 uppercase">
                    Status IEEE
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      selectedItem.status_ieee?.includes("Normal")
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {selectedItem.status_ieee}
                  </p>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gas List */}
                <div className="grid grid-cols-2 gap-3 h-fit">
                  {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map(
                    (gas) => (
                      <div
                        key={gas}
                        className={`p-3 rounded border text-center ${
                          isDarkMode
                            ? "border-slate-600 bg-slate-700"
                            : "border-gray-200"
                        }`}
                      >
                        <p className="text-xs uppercase opacity-60 font-bold">
                          {gas}
                        </p>
                        <p className="text-lg font-mono font-bold">
                          {selectedItem[gas]}
                        </p>
                      </div>
                    )
                  )}
                </div>
                {/* Duval Pentagon */}
                <div
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center ${
                    isDarkMode
                      ? "bg-slate-700/50 border-slate-600"
                      : "bg-gray-50"
                  }`}
                >
                  <p className="text-xs font-bold mb-4 uppercase tracking-widest opacity-60">
                    Duval Pentagon
                  </p>
                  <div className="transform scale-100">
                    <DuvalPentagon
                      h2={selectedItem.h2}
                      ch4={selectedItem.ch4}
                      c2h6={selectedItem.c2h6}
                      c2h4={selectedItem.c2h4}
                      c2h2={selectedItem.c2h2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div
              className={`p-4 border-t flex justify-end gap-3 ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <button
                onClick={() => generatePDFFromTemplate(selectedItem)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex gap-2 items-center"
              >
                <Download size={16} /> PDF
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border rounded-lg font-bold text-sm hover:bg-gray-500/10"
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
