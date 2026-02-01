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
  Edit2,
  Save,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import {
  generatePDFFromTemplate,
  generatePDFBlob,
} from "../utils/PDFGenerator";
import DuvalPentagon from "./DuvalPentagon";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "../lib/supabaseClient";
import ExcelImportModal from "./ExcelImportModal";

// --- 1. DEFINISI MAPPING ---
const ULTG_MAPPING = {
  Lopana: [
    "GI AMURANG",
    "GI LOPANA",
    "GI KAWANGKOAN",
    "PLTP LAHENDONG 12",
    "PLTP LAHENDONG 34",
    "GI TOMOHON",
    "GI TASIKRIA",
    "GI TONSEALAMA",
    "GI SAWANGAN",
  ],
  Sawangan: [
    "GI TELING",
    "GIS TELING",
    "GIS SARIO",
    "GI KEMA",
    "GI TANJUNG MERAH",
    "GI BITUNG",
    "GI RANOMUUT",
    "GI PANIKI",
    "GI PANDU",
    "GI LIKUPANG",
    "GI LIKUPANG NEW",
    "GI MSM",
  ],
  Kotamobagu: [
    "PLTU SULUT 1",
    "GI LOLAK",
    "GI MOLIBAGU",
    "GI OTAM",
    "GI TUTUYAN",
  ],
  Gorontalo: [
    "GI MARISA",
    "GI TILAMUTA",
    "GI TOLINGGULA",
    "GI ANGGREK",
    "GI ISIMU",
    "GI GORONTALO BARU",
    "GI BOTUPINGGE",
    "GI BOROKO",
  ],
};

const HistoryPage = ({
  historyData,
  isDarkMode,
  fetchHistory,
  loadingHistory,
  onDeleteAll,
  userRole,
  userUnit,
}) => {
  // State Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortTdcg, setSortTdcg] = useState("default");

  // State Item & Action
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single' | 'batch' | 'all', id?: number, count?: number }
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // State Batch
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // State Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [masterAssets, setMasterAssets] = useState([]);

  // Pagination (Dibuat State agar bisa diubah user)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10

  // State Import Excel
  const [showImportModal, setShowImportModal] = useState(false);

  // --- FETCH MASTER ASSETS ---
  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from("assets_trafo").select("*");
      if (data) setMasterAssets(data);
    };
    fetchAssets();
  }, []);

  const uniqueGIs = useMemo(
    () => [...new Set(masterAssets.map((a) => a.lokasi_gi))].sort(),
    [masterAssets],
  );

  const availableTrafosForEdit = useMemo(() => {
    if (!editFormData.lokasi_gi) return [];
    return masterAssets
      .filter((a) => a.lokasi_gi === editFormData.lokasi_gi)
      .map((a) => a.nama_trafo)
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || 0);
        const bNum = parseInt(b.match(/\d+/)?.[0] || 0);
        return aNum - bNum;
      });
  }, [editFormData.lokasi_gi, masterAssets]);

  // --- EDIT LOGIC ---
  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditFormData({
      id: item.id,
      lokasi_gi: item.lokasi_gi,
      nama_trafo: item.nama_trafo,
      merk_trafo: item.merk_trafo,
      serial_number: item.serial_number,
      tahun_pembuatan: item.tahun_pembuatan,
      level_tegangan: item.level_tegangan,
      diambil_oleh: item.diambil_oleh,
      tanggal_sampling: item.tanggal_sampling,
    });
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === "lokasi_gi") {
      setEditFormData((prev) => ({
        ...prev,
        lokasi_gi: value,
        nama_trafo: "",
      }));
    } else if (name === "nama_trafo") {
      const asset = masterAssets.find(
        (a) => a.lokasi_gi === editFormData.lokasi_gi && a.nama_trafo === value,
      );
      setEditFormData((prev) => ({
        ...prev,
        nama_trafo: value,
        merk_trafo: asset?.merk || prev.merk_trafo,
        serial_number: asset?.serial_number || prev.serial_number,
        tahun_pembuatan: asset?.tahun_pembuatan || prev.tahun_pembuatan,
        level_tegangan: asset?.level_tegangan || prev.level_tegangan,
      }));
    } else {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from("riwayat_uji")
        .update(editFormData)
        .eq("id", editFormData.id);
      if (error) throw error;
      toast.success("Data berhasil diperbarui!");
      fetchHistory();
      setIsEditing(false);
      setSelectedItem(null);
    } catch (e) {
      toast.error("Gagal update: " + e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    let baseData = historyData;
    const isSuperAdmin = userRole === "super_admin" || !userUnit;

    if (!isSuperAdmin) {
      const allowedGIs = ULTG_MAPPING[userUnit] || [];
      baseData = historyData.filter((item) => {
        const itemGI = (item.lokasi_gi || "").trim();
        return allowedGIs.some(
          (allowed) =>
            itemGI.toLowerCase().includes(allowed.toLowerCase()) ||
            allowed.toLowerCase().includes(itemGI.toLowerCase()),
        );
      });
    }

    let result = baseData.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchText =
        (item.nama_trafo || "").toLowerCase().includes(term) ||
        (item.lokasi_gi || "").toLowerCase().includes(term);

      const itemYear = item.tanggal_sampling
        ? item.tanggal_sampling.split("-")[0]
        : "";
      const matchYear = selectedYear === "All" || itemYear === selectedYear;

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

    if (sortTdcg === "highest") {
      result = result.sort((a, b) => (b.tdcg || 0) - (a.tdcg || 0));
    } else if (sortTdcg === "lowest") {
      result = result.sort((a, b) => (a.tdcg || 0) - (b.tdcg || 0));
    } else {
      // Default: Sort by ID descending (newest data first at top)
      result = result.sort((a, b) => (b.id || 0) - (a.id || 0));
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

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear, selectedStatus, sortTdcg, itemsPerPage]);

  const availableYears = useMemo(() => {
    const years = new Set(
      historyData.map((i) => i.tanggal_sampling?.split("-")[0]).filter(Boolean),
    );
    ["2023", "2024", "2025", "2026"].forEach((y) => years.add(y));
    return Array.from(years).sort().reverse();
  }, [historyData]);

  // --- HANDLERS ---
  const handleDelete = async (id) => {
    // Tampilkan modal konfirmasi
    const item = historyData.find((d) => d.id === id);
    setDeleteTarget({ type: 'single', id, item });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'single') {
        await supabase.from("riwayat_uji").delete().eq("id", deleteTarget.id);
        toast.success("Data berhasil dihapus");
      } else if (deleteTarget.type === 'batch') {
        let count = 0;
        for (const id of selectedIds) {
          await supabase.from("riwayat_uji").delete().eq("id", id);
          count++;
        }
        toast.success(`${count} data berhasil dihapus`);
        setSelectedIds([]);
        setSelectionMode(false);
      } else if (deleteTarget.type === 'all') {
        await onDeleteAll();
        toast.success("Semua data berhasil dihapus");
      }

      fetchHistory();
    } catch (e) {
      toast.error("Gagal menghapus: " + e.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteConfirmText("");
    }
  };

  const handleClearAll = async () => {
    if (historyData.length === 0) {
      toast.info("Data kosong.");
      return;
    }
    // Tampilkan modal konfirmasi untuk hapus semua
    setDeleteTarget({ type: 'all', count: historyData.length });
    setDeleteConfirmText("");
    setShowDeleteModal(true);
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
      toast.warning("Pilih minimal 1 data.");
      return;
    }
    toast.info(`Memproses ${selectedIds.length} data...`);
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
            setTimeout(() => reject(new Error("timeout")), 10000),
          ),
        ]);

        if (pdfBlob) {
          const filename =
            `Laporan_DGA_${item.nama_trafo}_${item.tanggal_sampling}_${id}.pdf`.replace(
              /[^a-z0-9_.-]/gi,
              "_",
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
    // Tampilkan modal konfirmasi
    setDeleteTarget({ type: 'batch', count: selectedIds.length });
    setShowDeleteModal(true);
  };

  const thClass = `px-6 py-4 text-left text-xs font-bold uppercase ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-600"
    }`;
  const tdClass = `px-6 py-4 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"
    }`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* HEADER & FILTER */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2
              className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-[#1B7A8F]"}`}
            >
              Riwayat Arsip Data Pengujian {userUnit ? `(${userUnit})` : ""}
            </h2>
            <p
              className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              Total: {filteredData.length} / {historyData.length} Data
            </p>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div
          className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-200"}`}
        >
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
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium outline-none cursor-pointer ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
              >
                <option value="All">Semua Tahun</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Sort TDCG */}
            <div className="relative flex-1 md:flex-none md:w-40">
              <ArrowUpDown
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={sortTdcg}
                onChange={(e) => setSortTdcg(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium outline-none cursor-pointer ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
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
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm font-medium outline-none cursor-pointer ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
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
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!selectionMode ? (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <FileSpreadsheet size={16} /> <span>Import Excel</span>
                </button>
                <button
                  onClick={toggleSelectionMode}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <CheckSquare size={16} /> <span>Seleksi Batch</span>
                </button>
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
        className={`rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? "bg-[#1e293b] border-slate-700" : "bg-white border-gray-200"}`}
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
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => selectionMode && toggleSelectItem(item.id)}
                    className={`${isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"} ${selectionMode && selectedIds.includes(item.id) ? (isDarkMode ? "bg-blue-900/20" : "bg-blue-50") : ""} ${selectionMode ? "cursor-pointer" : ""}`}
                  >
                    {selectionMode && (
                      <td className={`text-center ${tdClass}`}>
                        <div className="flex items-center justify-center w-full">
                          {selectedIds.includes(item.id) ? (
                            <CheckSquare size={18} className="text-blue-500" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                    )}
                    <td className={tdClass}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Calendar size={14} className="text-[#1B7A8F]" />{" "}
                        {item.tanggal_sampling}
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        #{filteredData.length - ((currentPage - 1) * itemsPerPage + index)}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <div
                        className={`font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      >
                        {item.nama_trafo}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin size={12} /> {item.lokasi_gi}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${item.status_ieee.includes("Normal") ? "bg-green-100 text-green-700" : item.status_ieee.includes("Waspada") ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}
                      >
                        {item.status_ieee}
                      </span>
                    </td>
                    <td className={`text-center font-bold ${tdClass}`}>
                      {Math.round(item.tdcg)}
                    </td>
                    {!selectionMode && (
                      <td className={`text-center ${tdClass}`}>
                        <div className="flex justify-center gap-2">
                          {/* Edit Button with Tooltip */}
                          <div className="relative group">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-orange-500 bg-orange-50 rounded hover:bg-orange-100 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                              Edit identitas trafo & sampling
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                          {/* Detail Button with Tooltip */}
                          <div className="relative group">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="p-2 text-blue-500 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                            >
                              <Info size={16} />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                              Lihat detail hasil analisis DGA
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                          {/* Download PDF Button with Tooltip */}
                          <div className="relative group">
                            <button
                              onClick={() => generatePDFFromTemplate(item)}
                              className="p-2 text-green-500 bg-green-50 rounded hover:bg-green-100 transition-colors"
                            >
                              <Download size={16} />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                              Cetak laporan PDF pengujian
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                          {/* Delete Button with Tooltip */}
                          <div className="relative group">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-500 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                              Hapus data pengujian ini
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
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

      {/* PAGINATION (DENGAN SELECTOR JUMLAH BARIS) */}
      {filteredData.length > 0 && (
        <div
          className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
        >
          {/* SELECTOR BARIS PER HALAMAN */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
            >
              Baris per halaman:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className={`text-xs p-1 rounded border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-700"}`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <span
            className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
          >
            Halaman <strong>{currentPage}</strong> dari{" "}
            <strong>{totalPages}</strong>
          </span>

          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className={`p-2 rounded hover:bg-gray-500/10 disabled:opacity-30 ${isDarkMode ? "text-white" : "text-gray-800"}`}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className={`p-2 rounded hover:bg-gray-500/10 disabled:opacity-30 ${isDarkMode ? "text-white" : "text-gray-800"}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL DETAIL / EDIT --- */}
      {selectedItem && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            {/* Header Modal */}
            <div
              className={`flex justify-between items-center p-6 border-b ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
            >
              <div>
                <h3
                  className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  {isEditing ? (
                    <>
                      <Edit2 className="text-orange-500" /> Edit Identitas Aset
                    </>
                  ) : (
                    <>
                      <Zap className="text-yellow-500" /> Detail Pengujian
                    </>
                  )}
                </h3>
                <p className="text-sm opacity-60">
                  {selectedItem.nama_trafo} - {selectedItem.lokasi_gi}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsEditing(false);
                }}
                className="p-2 hover:bg-gray-500/20 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Lokasi GI
                      </label>
                      <select
                        name="lokasi_gi"
                        value={editFormData.lokasi_gi}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200"}`}
                      >
                        <option value="">-- Pilih GI --</option>
                        {uniqueGIs.map((gi, i) => (
                          <option key={i} value={gi}>
                            {gi}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Nama Trafo
                      </label>
                      <select
                        name="nama_trafo"
                        value={editFormData.nama_trafo}
                        onChange={handleEditChange}
                        disabled={!editFormData.lokasi_gi}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200"}`}
                      >
                        <option value="">-- Pilih Trafo --</option>
                        {availableTrafosForEdit.map((t, i) => (
                          <option key={i} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Merk
                      </label>
                      <input
                        name="merk_trafo"
                        value={editFormData.merk_trafo}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        S/N
                      </label>
                      <input
                        name="serial_number"
                        value={editFormData.serial_number}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Tahun Pembuatan
                      </label>
                      <input
                        type="number"
                        name="tahun_pembuatan"
                        value={editFormData.tahun_pembuatan}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Level Tegangan
                      </label>
                      <input
                        name="level_tegangan"
                        value={editFormData.level_tegangan}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Petugas Sampling
                      </label>
                      <input
                        name="diambil_oleh"
                        value={editFormData.diambil_oleh}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">
                        Tanggal Sampling
                      </label>
                      <input
                        type="date"
                        name="tanggal_sampling"
                        value={editFormData.tanggal_sampling}
                        onChange={handleEditChange}
                        className={`w-full p-2 rounded border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg flex items-start gap-3">
                    <AlertTriangle
                      className="text-yellow-600 shrink-0"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-bold text-yellow-700 dark:text-yellow-500">
                        Perhatian
                      </p>
                      <p className="text-xs text-yellow-600/80">
                        Data hasil pengujian gas (H2, CH4, dll) dan diagnosa AI{" "}
                        <strong>tidak dapat diubah</strong> untuk menjaga
                        integritas data historis. Jika ada kesalahan input gas,
                        silakan hapus data ini dan input ulang.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div
                      className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-blue-50 border-blue-200"}`}
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
                      className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-700 border-slate-600" : "bg-blue-50 border-blue-200"}`}
                    >
                      <p className="text-xs font-bold opacity-60 uppercase">
                        Status IEEE
                      </p>
                      <p
                        className={`text-xl font-bold ${selectedItem.status_ieee?.includes("Normal") ? "text-green-500" : "text-red-500"}`}
                      >
                        {selectedItem.status_ieee}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-3 h-fit">
                      {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map(
                        (gas) => (
                          <div
                            key={gas}
                            className={`p-3 rounded border text-center ${isDarkMode ? "border-slate-600 bg-slate-700" : "border-gray-200"}`}
                          >
                            <p className="text-xs uppercase opacity-60 font-bold">
                              {gas}
                            </p>
                            <p className="text-lg font-mono font-bold">
                              {selectedItem[gas]}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                    <div
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center ${isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-gray-50"}`}
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
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div
              className={`p-4 border-t flex justify-end gap-3 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-gray-50"}`}
            >
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border rounded-lg font-bold text-sm hover:bg-gray-500/10"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex gap-2 items-center"
                  >
                    {isSavingEdit ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}{" "}
                    Simpan Perubahan
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openEditModal(selectedItem)}
                    className="px-4 py-2 border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg font-bold text-sm flex gap-2 items-center"
                  >
                    <Edit2 size={16} /> Edit Identitas
                  </button>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            {/* Header */}
            <div className="bg-red-600 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold">
                {deleteTarget?.type === 'single' && "Konfirmasi Hapus Data"}
                {deleteTarget?.type === 'batch' && "Konfirmasi Hapus Data Terpilih"}
                {deleteTarget?.type === 'all' && "Konfirmasi Hapus SEMUA Data"}
              </h3>
              <p className="text-sm opacity-80 mt-1">
                {deleteTarget?.type === 'single' && "Anda akan menghapus 1 data pengujian"}
                {deleteTarget?.type === 'batch' && `Anda akan menghapus ${deleteTarget.count} data terpilih`}
                {deleteTarget?.type === 'all' && `Anda akan menghapus SEMUA data pengujian (${deleteTarget?.count || 0} data)`}
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Info data yang akan dihapus */}
              {deleteTarget?.type === 'single' && deleteTarget.item && (
                <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    {deleteTarget.item.nama_trafo}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {deleteTarget.item.lokasi_gi} • {deleteTarget.item.tanggal_sampling}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    ID: #{deleteTarget.item.id}
                  </p>
                </div>
              )}

              {deleteTarget?.type === 'batch' && (
                <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    {deleteTarget.count} Data Terpilih
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    Data yang dipilih akan dihapus secara permanen
                  </p>
                </div>
              )}

              {deleteTarget?.type === 'all' && (
                <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                  <p className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    {deleteTarget?.count || 0} Data Akan Dihapus
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    Seluruh riwayat pengujian DGA akan dihapus secara permanen
                  </p>
                </div>
              )}

              <div className={`p-4 rounded-lg border-2 border-dashed mb-4 ${isDarkMode ? "border-red-800 bg-red-900/20" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-bold ${isDarkMode ? "text-red-400" : "text-red-700"}`}>
                      Peringatan!
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-red-300/80" : "text-red-600/80"}`}>
                      Tindakan ini tidak dapat dibatalkan. Data yang dihapus tidak bisa dikembalikan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Double verification input - hanya untuk hapus semua */}
              {deleteTarget?.type === 'all' && (
                <>
                  <div className="mb-4">
                    <label className={`block text-sm font-bold mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                      Ketik <span className="text-red-500 font-mono bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">HAPUS</span> untuk konfirmasi:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Ketik HAPUS di sini..."
                      className={`w-full px-4 py-3 rounded-lg border-2 text-center font-mono text-lg uppercase tracking-widest outline-none transition-all ${deleteConfirmText.trim().toUpperCase() === "HAPUS"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : isDarkMode
                          ? "border-slate-600 bg-slate-700 text-white"
                          : "border-gray-300 bg-white"
                        }`}
                    />
                  </div>

                  {/* Progress indicator */}
                  {deleteConfirmText && deleteConfirmText.trim().toUpperCase() !== "HAPUS" && (
                    <p className={`text-xs text-center mb-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {"HAPUS".slice(0, deleteConfirmText.trim().length) === deleteConfirmText.trim().toUpperCase()
                        ? `✓ ${deleteConfirmText.trim().length}/5 karakter benar`
                        : "✗ Ketik 'HAPUS' dengan benar"}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex gap-3 ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-gray-50"}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={(deleteTarget?.type === 'all' && deleteConfirmText.trim().toUpperCase() !== "HAPUS") || isDeleting}
                className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${((deleteTarget?.type !== 'all') || (deleteTarget?.type === 'all' && deleteConfirmText.trim().toUpperCase() === "HAPUS")) && !isDeleting
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Hapus Permanen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL */}
      {showImportModal && (
        <ExcelImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchHistory();
            setShowImportModal(false);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default HistoryPage;
