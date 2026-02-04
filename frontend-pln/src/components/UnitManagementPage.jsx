import React, { useState, useEffect } from "react";
import {
  Map,
  Plus,
  Trash2,
  MapPin,
  Building2,
  ChevronRight,
  RefreshCw,
  Globe,
  Database,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { ultgData } from "../data/assetData"; // 🔥 IMPORT DATA RIIL (ULTG DATA)

const API_URL = "http://127.0.0.1:8000";

export default function UnitManagementPage({
  session,
  isDarkMode,
  onUpdateMapping,
}) {
  const [hierarchy, setHierarchy] = useState({});
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // State Form
  const [newUltg, setNewUltg] = useState("");
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

  // 🔥 FITUR IMPORT DATA RIIL (DENGAN KOORDINAT)
  const handleImportInitialData = async () => {
    if (
      !confirm(
        "Import data riil dari assetData.js? \n\nPastikan database 'master_ultg' dan 'master_gi' masih kosong untuk hasil terbaik.",
      )
    )
      return;

    setIsImporting(true);
    const toastId = toast.loading("Sedang mengimport data & koordinat...");

    try {
      let successCount = 0;
      let failCount = 0;

      // Loop data dari ultgData (bukan INITIAL_DATA lagi)
      // ultgData strukturnya: { sawangan: { name: "ULTG Sawangan", gis: [...] }, ... }
      const units = Object.values(ultgData);

      for (const unit of units) {
        const ultgName = unit.name; // Contoh: "ULTG Sawangan"

        // A. Daftar ULTG
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
          console.warn(`ULTG ${ultgName} mungkin sudah ada.`);
        }

        // B. Loop setiap GI di dalam ULTG tersebut
        for (const gi of unit.gis) {
          // gi strukturnya: { name: "GI TELING", lat: 1.45.., lng: 124.85.. }
          try {
            const res = await fetch(`${API_URL}/admin/master/add-gi`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nama_gi: gi.name,
                nama_ultg: ultgName,
                lat: gi.lat || 0,
                lon: gi.lng || 0, // 🔥 Mapping 'lng' di JS ke 'lon' di DB
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

      toast.success(
        `Import Selesai! ${successCount} GI berhasil ditambahkan.`,
        { id: toastId },
      );
      fetchHierarchy(); // Refresh tampilan
    } catch (err) {
      toast.error("Terjadi kesalahan saat import: " + err.message, {
        id: toastId,
      });
    } finally {
      setIsImporting(false);
    }
  };

  // --- Fungsi CRUD Manual (Tetap Sama) ---

  const handleAddUltg = async (e) => {
    e.preventDefault();
    if (!newUltg.trim()) return;
    const toastId = toast.loading("Menambahkan ULTG...");
    try {
      const res = await fetch(`${API_URL}/admin/master/add-ultg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_ultg: newUltg,
          requester_email: session.user.email,
        }),
      });
      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);
      toast.success(data.msg, { id: toastId });
      setNewUltg("");
      fetchHierarchy();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleDeleteUltg = async (nama) => {
    if (!confirm(`Hapus ${nama}? Semua GI di dalamnya juga akan terhapus!`))
      return;
    const toastId = toast.loading("Menghapus...");
    try {
      const res = await fetch(
        `${API_URL}/admin/master/delete-ultg/${nama}?requester_email=${session.user.email}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);
      toast.success(data.msg, { id: toastId });
      fetchHierarchy();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

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

  const handleDeleteGi = async (giName, ultgName) => {
    if (!confirm(`Hapus ${giName}?`)) return;
    try {
      const res = await fetch(
        `${API_URL}/admin/master/delete-gi?nama_gi=${giName}&nama_ultg=${ultgName}&requester_email=${session.user.email}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.status === "Sukses") {
        toast.success("Terhapus");
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-[#1B7A8F]" /> Manajemen Unit & Peta
          </h1>
          <p className="text-sm opacity-60">
            Kelola Lokasi Gardu Induk dan Titik Koordinat Peta
          </p>
        </div>

        <div className="flex gap-2">
          {/* TOMBOL IMPORT DATA RIIL */}
          <button
            onClick={handleImportInitialData}
            disabled={isImporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${isDarkMode ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800 hover:bg-emerald-900" : "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200"}`}
          >
            <UploadCloud size={16} />
            {isImporting ? "Mengimport..." : "Import Data Riil + Koordinat"}
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
        {/* FORM INPUT */}
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Map size={18} /> Tambah ULTG
            </h3>
            <form onSubmit={handleAddUltg} className="flex gap-2">
              <input
                value={newUltg}
                onChange={(e) => setNewUltg(e.target.value)}
                placeholder="Nama ULTG (ex: Minahasa)"
                className={`flex-1 p-2 rounded-lg border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
              />
              <button
                type="submit"
                className="bg-[#1B7A8F] text-white p-2 rounded-lg"
              >
                <Plus />
              </button>
            </form>
          </div>

          <div
            className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <MapPin size={18} /> Tambah GI & Koordinat
            </h3>
            <form onSubmit={handleAddGi} className="space-y-3">
              <select
                value={newGi.ultg}
                onChange={(e) => setNewGi({ ...newGi, ultg: e.target.value })}
                className={`w-full p-2 rounded-lg border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
              >
                <option value="">Pilih ULTG...</option>
                {Object.keys(hierarchy).map((ultg) => (
                  <option key={ultg} value={ultg}>
                    {ultg}
                  </option>
                ))}
              </select>
              <input
                value={newGi.name}
                onChange={(e) => setNewGi({ ...newGi, name: e.target.value })}
                placeholder="Nama GI (ex: GI Tondano)"
                className={`w-full p-2 rounded-lg border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={newGi.lat}
                  onChange={(e) => setNewGi({ ...newGi, lat: e.target.value })}
                  placeholder="Latitude"
                  className={`flex-1 p-2 rounded-lg border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
                />
                <input
                  type="number"
                  step="any"
                  value={newGi.lon}
                  onChange={(e) => setNewGi({ ...newGi, lon: e.target.value })}
                  placeholder="Longitude"
                  className={`flex-1 p-2 rounded-lg border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-gray-50"}`}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#1B7A8F] text-white py-2 rounded-lg font-bold hover:bg-[#155e6e]"
              >
                Simpan Lokasi
              </button>
            </form>
          </div>
        </div>

        {/* LIST DATA */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-start">
          {Object.keys(hierarchy).length === 0 && !loading && (
            <div className="col-span-2 text-center py-10 opacity-50 flex flex-col items-center gap-2">
              <Database size={40} />
              <p>Database Kosong. Klik tombol "Import Data Riil" di atas.</p>
            </div>
          )}

          {Object.entries(hierarchy).map(([ultg, gis]) => (
            <div
              key={ultg}
              className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
            >
              <div className="p-4 bg-[#1B7A8F]/10 flex justify-between items-center border-b border-gray-500/10">
                <h4 className="font-bold text-lg text-[#1B7A8F]">{ultg}</h4>
                <button
                  onClick={() => handleDeleteUltg(ultg)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                {gis.length === 0 ? (
                  <p className="text-xs text-center opacity-50 p-4">
                    Belum ada GI
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {gis.map((gi, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-center p-2 hover:bg-gray-500/5 rounded group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <ChevronRight size={14} className="opacity-50" />{" "}
                            {gi.name}
                          </span>
                          {(gi.lat !== 0 || gi.lon !== 0) && (
                            <span className="text-[10px] opacity-50 ml-6 flex items-center gap-1 font-mono">
                              <Globe size={10} /> {gi.lat}, {gi.lon}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteGi(gi.name, ultg)}
                          className="opacity-0 group-hover:opacity-100 text-red-400"
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
