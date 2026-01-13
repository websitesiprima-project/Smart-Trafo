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
} from "lucide-react";
import ExcelImporter from "./ExcelImporter";
import { toast } from "sonner";

const HistoryPage = ({
  historyData,
  isDarkMode,
  fetchHistory,
  loadingHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      historyData.map((i) => i.tanggal_sampling?.split("-")[0]).filter(Boolean)
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
    if (historyData.length === 0) return toast.info("Data kosong.");
    if (
      window.prompt(
        `Ketik "HAPUS" untuk menghapus ${historyData.length} data:`
      ) !== "HAPUS"
    )
      return;

    setIsDeleting(true);
    let count = 0;
    for (const item of historyData) {
      try {
        await fetch(`http://127.0.0.1:8000/history/${item.id}`, {
          method: "DELETE",
          keepalive: true,
        });
        count++;
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`Dihapus: ${count} data.`);
    fetchHistory();
    setIsDeleting(false);
  };

  // Styles
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
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold text-sm flex items-center gap-2"
          >
            <FileText size={16} /> Cetak
          </button>
        </div>
      </div>

      {/* IMPORT EXCEL (FITUR BARU) */}
      <ExcelImporter onImportSuccess={fetchHistory} />

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
                <th className={thClass}>Tanggal</th>
                <th className={thClass}>Identitas</th>
                <th className={thClass}>Status</th>
                <th className={`text-center ${thClass}`}>TDCG</th>
                <th className={`text-center ${thClass}`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
                    }
                  >
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
                    <td className={`text-center ${tdClass}`}>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 text-blue-500 bg-blue-50 rounded hover:bg-blue-100"
                        >
                          <Info size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-500 bg-red-50 rounded hover:bg-red-100"
                        >
                          <Trash2 size={16} />
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

      {/* MODAL DETAIL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
              isDarkMode ? "bg-slate-800 text-white" : "bg-white text-gray-900"
            }`}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Detail Data</h3>
              <button onClick={() => setSelectedItem(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map((g) => (
                <div
                  key={g}
                  className="flex justify-between border-b border-dashed pb-1"
                >
                  <span className="uppercase text-xs font-bold text-gray-500">
                    {g}
                  </span>
                  <span className="font-mono font-bold">{selectedItem[g]}</span>
                </div>
              ))}
              <div className="col-span-2 bg-blue-50 p-2 rounded flex justify-between text-blue-700 font-bold">
                <span>TDCG</span>
                <span>{selectedItem.tdcg} ppm</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
