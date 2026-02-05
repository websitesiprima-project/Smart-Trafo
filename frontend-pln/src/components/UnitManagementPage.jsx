import React, { useState, useEffect } from "react";
import {
  Map,
  Trash2,
  MapPin,
  Building2,
  ChevronRight,
  RefreshCw,
  Globe,
  Database,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
// Pastikan file assetData.js ada, atau komentar baris ini jika belum ada
import { ultgData } from "../data/assetData";

const API_URL = "http://127.0.0.1:8000";

export default function UnitManagementPage({
  session,
  isDarkMode,
  onUpdateMapping,
}) {
  const [hierarchy, setHierarchy] = useState({});
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // State Form (HANYA untuk GI, karena ULTG dibuat di User Management)
  const [newGi, setNewGi] = useState({ ultg: "", name: "", lat: "", lon: "" });

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/master/hierarchy`);
      const data = await res.json();
      setHierarchy(data);
      if (onUpdateMapping) onUpdateMapping(data);
    } catch (error) {
      toast.error("Gagal mengambil data unit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  // --- FITUR IMPORT DATA RIIL ---
  const handleImportInitialData = async () => {
    if (
      !confirm(
        "Import data riil? \nPastikan database masih bersih untuk hasil terbaik.",
      )
    )
      return;

    setIsImporting(true);
    const toastId = toast.loading("Mengimport data...");

    try {
      let successCount = 0;
      let failCount = 0;
      const units = Object.values(ultgData);

      for (const unit of units) {
        const ultgName = unit.name;

        // 1. Buat ULTG (Skip jika ada)
        try {
          await fetch(`${API_URL}/admin/master/add-ultg`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nama_ultg: ultgName,
              requester_email: session.user.email,
            }),
          });
        } catch (e) {
          console.log("Skip ULTG exists");
        }

        // 2. Buat GI
        for (const gi of unit.gis) {
          try {
            const res = await fetch(`${API_URL}/admin/master/add-gi`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nama_gi: gi.name,
                nama_ultg: ultgName,
                lat: gi.lat || 0,
                lon: gi.lng || 0,
                requester_email: session.user.email,
              }),
            });
            if (res.ok) successCount++;
            else failCount++;
          } catch (e) {
            failCount++;
          }
        }
      }

      toast.success(`Selesai! ${successCount} GI berhasil ditambahkan.`, {
        id: toastId,
      });
      fetchHierarchy();
    } catch (err) {
      toast.error("Gagal import: " + err.message, { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  // --- Fungsi Tambah GI (Gardu Induk) ---
  const handleAddGi = async (e) => {
    e.preventDefault();
    if (!newGi.ultg || !newGi.name)
      return toast.error("Pilih ULTG dan isi nama GI");

    const toastId = toast.loading("Menambahkan GI...");
    try {
      const res = await fetch(`${API_URL}/admin/master/add-gi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_gi: newGi.name,
          nama_ultg: newGi.ultg,
          lat: parseFloat(newGi.lat) || 0,
          lon: parseFloat(newGi.lon) || 0,
          requester_email: session.user.email,
        }),
      });

      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);

      toast.success(data.msg, { id: toastId });
      setNewGi({ ...newGi, name: "", lat: "", lon: "" });
      fetchHierarchy();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  // --- Fungsi Hapus ULTG (Hanya untuk Admin jika salah input) ---
  const handleDeleteUltg = async (nama) => {
    if (
      !confirm(
        `PERINGATAN: Menghapus ULTG ${nama} akan menghapus SEMUA data GI di dalamnya.\n\nLanjutkan?`,
      )
    )
      return;

    const toastId = toast.loading("Menghapus Unit...");
    try {
      const res = await fetch(
        `${API_URL}/admin/master/delete-ultg/${nama}?requester_email=${session.user.email}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);

      toast.success("Unit berhasil dihapus", { id: toastId });
      fetchHierarchy();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleDeleteGi = async (giName, ultgName) => {
    if (!confirm(`Hapus ${giName}?`)) return;
    try {
      const res = await fetch(
        `${API_URL}/admin/master/delete-gi?nama_gi=${giName}&nama_ultg=${ultgName}&requester_email=${session.user.email}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.status === "Sukses") {
        toast.success("GI Terhapus");
        fetchHierarchy();
      } else {
        toast.error(data.msg);
      }
    } catch (e) {
      toast.error("Gagal hapus");
    }
  };

  return (
    <div
      className={`p-6 min-h-screen ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-[#1B7A8F]" /> Manajemen Aset & Peta
          </h1>
          <p className="text-sm opacity-60">
            Kelola lokasi fisik Gardu Induk (GI) dan koordinat peta.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleImportInitialData}
            disabled={isImporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${isDarkMode ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800 hover:bg-emerald-900" : "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200"}`}
          >
            <UploadCloud size={16} />
            {isImporting ? "Mengimport..." : "Import Data Awal"}
          </button>

          <button
            onClick={fetchHierarchy}
            className="p-2 bg-gray-500/10 rounded-lg hover:bg-gray-500/20"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KOLOM KIRI: FORM TAMBAH GI (Aset Fisik) */}
        <div className="space-y-6">
          {/* INFO CARD */}
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed ${isDarkMode ? "bg-blue-900/20 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}`}
          >
            <div className="flex items-center gap-2 font-bold mb-2">
              <AlertTriangle size={16} /> Info Penting
            </div>
            Untuk menambah <b>Unit Layanan (ULTG)</b> baru, silakan gunakan menu{" "}
            <b>Manajemen User</b> agar unit otomatis terhubung dengan
            Manager-nya.
          </div>

          <div
            className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-[#1B7A8F]" /> Tambah Lokasi GI
            </h3>
            <form onSubmit={handleAddGi} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase opacity-50">
                  Pilih Unit Induk (ULTG)
                </label>
                <select
                  value={newGi.ultg}
                  onChange={(e) => setNewGi({ ...newGi, ultg: e.target.value })}
                  className={`w-full p-3 rounded-lg border outline-none mt-1 ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
                >
                  <option value="">-- Pilih ULTG --</option>
                  {Object.keys(hierarchy).map((ultg) => (
                    <option key={ultg} value={ultg}>
                      {ultg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase opacity-50">
                  Nama Gardu Induk
                </label>
                <input
                  value={newGi.name}
                  onChange={(e) => setNewGi({ ...newGi, name: e.target.value })}
                  placeholder="Contoh: GI Teling"
                  className={`w-full p-3 rounded-lg border outline-none mt-1 ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase opacity-50">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newGi.lat}
                    onChange={(e) =>
                      setNewGi({ ...newGi, lat: e.target.value })
                    }
                    placeholder="1.45..."
                    className={`w-full p-3 rounded-lg border outline-none mt-1 ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase opacity-50">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newGi.lon}
                    onChange={(e) =>
                      setNewGi({ ...newGi, lon: e.target.value })
                    }
                    placeholder="124.8..."
                    className={`w-full p-3 rounded-lg border outline-none mt-1 ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1B7A8F] text-white py-3 rounded-xl font-bold hover:bg-[#155e6e] shadow-lg transition"
              >
                Simpan Lokasi
              </button>
            </form>
          </div>
        </div>

        {/* KOLOM KANAN: LIST HIERARKI */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-start">
          {Object.keys(hierarchy).length === 0 && !loading && (
            <div className="col-span-2 text-center py-20 opacity-50 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <Database size={32} />
              </div>
              <p>
                Belum ada data unit. Silakan import atau tambah via User
                Management.
              </p>
            </div>
          )}

          {Object.entries(hierarchy).map(([ultg, gis]) => (
            <div
              key={ultg}
              className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
            >
              <div className="p-4 bg-[#1B7A8F]/10 flex justify-between items-center border-b border-gray-500/10">
                <h4 className="font-bold text-lg text-[#1B7A8F] flex items-center gap-2">
                  <Map size={18} /> {ultg}
                </h4>
                <button
                  onClick={() => handleDeleteUltg(ultg)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Hapus Unit"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                {gis.length === 0 ? (
                  <p className="text-xs text-center opacity-50 p-6 border-2 border-dashed border-gray-500/20 rounded m-2">
                    Belum ada Gardu Induk (GI)
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {gis.map((gi, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center p-3 hover:bg-gray-500/5 rounded-lg group transition"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]"></div>
                            {gi.name}
                          </span>
                          {gi.lat !== 0 || gi.lon !== 0 ? (
                            <span className="text-[10px] opacity-50 ml-4 flex items-center gap-1 font-mono mt-0.5">
                              <Globe size={10} /> {gi.lat}, {gi.lon}
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-400 ml-4 italic mt-0.5">
                              Belum ada koordinat
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteGi(gi.name, ultg)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 p-2 hover:bg-red-500/10 rounded transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
