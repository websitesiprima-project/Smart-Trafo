import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Save,
  Building2,
  Zap,
  Tag,
  Calendar,
  MapPin,
  Hash,
  Activity,
  FileText,
  ChevronDown,
  Trash2,
  Search,
  AlertCircle,
  Database,
  UploadCloud,
  Edit2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient"; // 🔥 IMPORT SUPABASE CLIENT

// Import Data
import { ultgData, trafoDatabase } from "../data/assetData";

// ============================================================================
// KOMPONEN INPUT
// ============================================================================
const PLNInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  isDarkMode,
}) => (
  <div className="flex flex-col gap-1.5 group">
    <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${isDarkMode ? "text-[#4FC3F7] group-focus-within:text-[#81D4FA]" : "text-[#006C92] group-focus-within:text-[#00A2E9]"}`}>
      {icon &&
        React.cloneElement(icon, {
          size: 14,
          className: "text-[#F9A825]",
        })}{" "}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none transition-all shadow-sm ${isDarkMode ? "bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:bg-slate-800" : "bg-[#F8FAFC] border-gray-300 text-gray-800 focus:border-[#00A2E9] focus:bg-white placeholder:text-gray-400/70"}`}
    />
  </div>
);

const SuperAdminPage = ({ session, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [assetList, setAssetList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDelete, setLoadingDelete] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // 🔥 STATE UNTUK DELETE MODAL
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 🔥 STATE UNTUK EDIT MODAL
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [formData, setFormData] = useState({
    ultg: "",
    lokasi_gi: "",
    nama_trafo: "",
    merk: "",
    serial_number: "",
    tahun_pembuatan: "",
    level_tegangan: "",
  });

  // --- FUNGSI SORTING ---
  const sortTrafos = (trafos) => {
    return [...trafos].sort((a, b) => {
      const aName = a.nama_trafo || "";
      const bName = b.nama_trafo || "";
      const aMatch = aName.match(/^([A-Z]+)\s*#?(\d+)$/i);
      const bMatch = bName.match(/^([A-Z]+)\s*#?(\d+)$/i);
      if (!aMatch || !bMatch) return aName.localeCompare(bName);
      const typeOrder = { TD: 1, GT: 2, IBT: 3 };
      const aOrder = typeOrder[aMatch[1].toUpperCase()] || 999;
      const bOrder = typeOrder[bMatch[1].toUpperCase()] || 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
    });
  };

  // 🔥 1. FETCH DATA LANGSUNG DARI SUPABASE (Bypass Python agar data pasti muncul)
  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets_trafo")
        .select("*")
        .order("lokasi_gi", { ascending: true });

      if (error) throw error;
      setAssetList(data || []);
    } catch (error) {
      console.error("Gagal ambil data aset:", error);
      toast.error("Gagal memuat data aset dari database.");
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // helper untuk mencari ULTG dari Nama GI (untuk import otomatis)
  const findUltgByGI = (giName) => {
    for (const [ultgKey, data] of Object.entries(ultgData)) {
      if (data.gis.some((g) => g.name === giName)) {
        // Return Capitalize (misal: "Sawangan")
        return data.name.replace("ULTG ", "");
      }
    }
    return "Unknown";
  };

  // 🔥 2. FITUR IMPORT DATA (LANGSUNG KE SUPABASE)
  const handleImportDefaults = async () => {
    if (
      !window.confirm(
        "Import semua data dari file 'assetData.js' ke Database? Data ganda mungkin terjadi jika tidak direset dulu.",
      )
    )
      return;

    setIsImporting(true);
    try {
      const payload = [];

      // Susun data dari file statis
      for (const [giName, trafos] of Object.entries(trafoDatabase)) {
        const detectedUltg = findUltgByGI(giName);

        for (const t of trafos) {
          payload.push({
            lokasi_gi: giName,
            nama_trafo: t.name,
            merk: t.merk || "-",
            serial_number: t.sn || "-",
            tahun_pembuatan: t.year || "-",
            level_tegangan: t.volt || "-",
            unit_ultg: detectedUltg, // Auto detect unit
            op_status: t.op_status || "Operasi",
            status: "Normal",
          });
        }
      }

      // Kirim Batch Insert ke Supabase
      const { error } = await supabase.from("assets_trafo").insert(payload);

      if (error) throw error;

      toast.success(`Berhasil mengimpor ${payload.length} aset!`);
      fetchAssets();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Gagal import data: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // 🔥 3. DELETE ASET - OPEN MODAL
  const openDeleteModal = (asset) => {
    setAssetToDelete(asset);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;

    setLoadingDelete(assetToDelete.id);
    try {
      const { error } = await supabase
        .from("assets_trafo")
        .delete()
        .eq("id", assetToDelete.id);
      if (error) throw error;

      toast.success("Aset berhasil dihapus.");
      fetchAssets();
    } catch (error) {
      toast.error("Gagal menghapus aset.");
    } finally {
      setLoadingDelete(null);
      setShowDeleteModal(false);
      setAssetToDelete(null);
      setDeleteConfirmText("");
    }
  };

  // 🔥 OPEN EDIT MODAL
  const openEditModal = (asset) => {
    setEditFormData({
      id: asset.id,
      lokasi_gi: asset.lokasi_gi || "",
      nama_trafo: asset.nama_trafo || "",
      merk: asset.merk || "",
      serial_number: asset.serial_number || "",
      tahun_pembuatan: asset.tahun_pembuatan || "",
      level_tegangan: asset.level_tegangan || "",
      unit_ultg: asset.unit_ultg || "",
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const confirmEdit = async () => {
    if (!editFormData) return;

    setLoadingEdit(true);
    try {
      const { error } = await supabase
        .from("assets_trafo")
        .update({
          lokasi_gi: editFormData.lokasi_gi,
          nama_trafo: editFormData.nama_trafo,
          merk: editFormData.merk,
          serial_number: editFormData.serial_number,
          tahun_pembuatan: editFormData.tahun_pembuatan,
          level_tegangan: editFormData.level_tegangan,
        })
        .eq("id", editFormData.id);

      if (error) throw error;

      toast.success("Aset berhasil diperbarui.");
      fetchAssets();
      setShowEditModal(false);
      setEditFormData(null);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui aset.");
    } finally {
      setLoadingEdit(false);
    }
  };

  // 🔥 4. TAMBAH ASET (LANGSUNG SUPABASE)
  const handleAddTrafo = async (e) => {
    e.preventDefault();
    if (!formData.lokasi_gi || !formData.nama_trafo || !formData.merk) {
      toast.error("Mohon lengkapi data wajib!");
      return;
    }
    setLoading(true);
    try {
      // Mapping unit key (sawangan -> Sawangan)
      const unitName = formData.ultg
        ? ultgData[formData.ultg]?.name.replace("ULTG ", "")
        : "Unknown";

      // 🔥 Hapus field 'ultg' karena tidak ada di tabel database
      const { ultg, ...dataToInsert } = formData;

      const { error } = await supabase.from("assets_trafo").insert([
        {
          ...dataToInsert,
          unit_ultg: unitName, // Pastikan kolom ini terisi
          serial_number: formData.serial_number || "-",
          tahun_pembuatan: formData.tahun_pembuatan || "-",
          level_tegangan: formData.level_tegangan || "-",
          status: "Normal",
          op_status: "Operasi",
        },
      ]);

      if (error) throw error;

      toast.success("Aset berhasil disimpan!");
      setFormData({
        ultg: "",
        lokasi_gi: "",
        nama_trafo: "",
        merk: "",
        serial_number: "",
        tahun_pembuatan: "",
        level_tegangan: "",
      });
      fetchAssets();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "ultg" ? { lokasi_gi: "" } : {}),
    }));
  };

  const filteredAssets = sortTrafos(
    assetList.filter(
      (item) =>
        item.nama_trafo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lokasi_gi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.merk.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  return (
    <div className="w-full min-h-screen relative overflow-x-hidden font-sans pb-20">
      {/* BACKGROUND */}
      <div className={`fixed inset-0 z-0 ${isDarkMode ? "bg-[#0f172a]" : "bg-[#00A2E9]"}`}>
        <div className={`absolute inset-0 ${isDarkMode ? "bg-gradient-to-b from-[#0f172a] to-[#1e293b]" : "bg-gradient-to-b from-[#00A2E9] to-[#0072BC]"}`}></div>
        {!isDarkMode && <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 14.018-1.454 21.184-4.063l1.768-.662C33.251 5.346 38.627 4 50 4c11.33 0 16.33 1.26 26.231 5.22 1.096.438 2.228.891 3.42 1.378.895.367 1.83.743 2.801 1.127C86.72 13.43 91.87 14.5 100 14.5V16c-10.51 0-17.75-1.574-27.76-5.52l-1.39-.567C60.77 5.924 56.666 5 50 5c-8.832 0-14.283 1.29-21.38 3.93l-1.767.662C19.72 12.25 14.53 13.5 0 13.5V14z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 12px",
          }}
        ></div>}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 space-y-8"
      >
        {/* HEADER */}
        <div className="text-center text-white">
          <div className="inline-flex items-center justify-center gap-2 mb-2 bg-white/20 backdrop-blur-md px-5 py-1.5 rounded-full border border-white/30 shadow-lg">
            <Zap size={18} className="text-[#FFD700] fill-[#FFD700]" />
            <span className="text-xs font-bold tracking-widest text-white uppercase">
              Super Admin Control
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            MANAJEMEN ASET MASTER
          </h1>
        </div>

        {/* --- FORM CARD --- */}
        <div className={`rounded-2xl shadow-xl overflow-hidden ${isDarkMode ? "bg-slate-800 shadow-black/30" : "bg-white shadow-blue-900/30"}`}>
          <div className={`px-8 py-5 border-b flex items-center gap-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
            <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-[#1B7A8F]/20 text-[#1B7A8F]" : "bg-[#E1F5FE] text-[#0277BD]"}`}>
              <FileText size={24} />
            </div>
            <div>
              <h3 className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Registrasi Trafo Baru
              </h3>
            </div>
          </div>

          <form onSubmit={handleAddTrafo} className="p-8">
            <div className={`border-2 border-dashed rounded-2xl p-6 mb-8 relative mt-2 ${isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-white border-[#B3E5FC]"}`}>
              <div className={`absolute -top-3 left-6 px-3 text-xs font-bold text-[#D32F2F] flex items-center gap-2 border rounded-full py-0.5 shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-[#B3E5FC]"}`}>
                <MapPin size={14} /> 1. Lokasi Penempatan
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#4FC3F7]" : "text-[#006C92]"}`}>
                    Unit Pelaksana (ULTG)
                  </label>
                  <div className="relative">
                    <select
                      name="ultg"
                      value={formData.ultg}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer transition ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                    >
                      <option value="">-- Pilih ULTG --</option>
                      {Object.entries(ultgData).map(([key, data]) => (
                        <option key={key} value={key}>
                          {data.name}
                        </option>
                      ))}
                    </select>

                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#4FC3F7]" : "text-[#006C92]"}`}>
                    Gardu Induk (GI)
                  </label>
                  <div className="relative">
                    <select
                      name="lokasi_gi"
                      value={formData.lokasi_gi}
                      onChange={handleChange}
                      disabled={!formData.ultg}
                      className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer transition ${isDarkMode ? "bg-slate-900 border-slate-600 text-white disabled:bg-slate-800 disabled:text-slate-500" : "bg-white border-gray-300 text-gray-800 disabled:bg-gray-100 disabled:text-gray-400"}`}
                    >
                      <option value="">-- Pilih GI --</option>
                      {formData.ultg &&
                        ultgData[formData.ultg]?.gis.map((gi) => (
                          <option key={gi.name} value={gi.name}>
                            {gi.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h4 className={`text-sm font-bold border-b-2 border-[#FFD700] pb-2 inline-flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  <Tag size={18} className="text-[#F9A825]" /> 2. Identitas Unit
                </h4>
                <PLNInput
                  label="Kode Bay / Trafo"
                  icon={<Zap />}
                  name="nama_trafo"
                  value={formData.nama_trafo}
                  onChange={handleChange}
                  placeholder="Contoh: IBT #2"
                  isDarkMode={isDarkMode}
                />
                <PLNInput
                  label="Merk Pabrikan"
                  icon={<Building2 />}
                  name="merk"
                  value={formData.merk}
                  onChange={handleChange}
                  placeholder="Contoh: UNINDO"
                  isDarkMode={isDarkMode}
                />
              </div>
              <div className="space-y-5">
                <h4 className={`text-sm font-bold border-b-2 border-[#00A2E9] pb-2 inline-flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  <Activity size={18} className="text-[#0277BD]" /> 3.
                  Spesifikasi
                </h4>
                <PLNInput
                  label="Nomor Seri"
                  icon={<Hash />}
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  placeholder="S/N..."
                  isDarkMode={isDarkMode}
                />
                <div className="grid grid-cols-2 gap-4">
                  <PLNInput
                    label="Tahun"
                    icon={<Calendar />}
                    type="number"
                    name="tahun_pembuatan"
                    value={formData.tahun_pembuatan}
                    onChange={handleChange}
                    placeholder="YYYY"
                    isDarkMode={isDarkMode}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? "text-[#4FC3F7]" : "text-[#006C92]"}`}>
                      <Activity size={14} className="text-[#F9A825]" /> Tegangan
                    </label>
                    <div className="relative">
                      <select
                        name="level_tegangan"
                        value={formData.level_tegangan}
                        onChange={handleChange}
                        disabled={!formData.lokasi_gi}
                        className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer transition ${isDarkMode ? "bg-slate-900 border-slate-600 text-white disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed" : "bg-[#F8FAFC] border-gray-300 text-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"}`}
                      >
                        <option value="">-- Pilih --</option>
                        <option value="150/20 kV">150/20 kV</option>
                        <option value="150/70 kV">150/70 kV</option>
                        <option value="70/20 kV">70/20 kV</option>
                        <option value="150 kV">150 kV</option>
                        <option value="275 kV">275 kV</option>
                        <option value="70 kV">70 kV</option>
                        <option value="30 kV">30 kV</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-8 pt-6 border-t flex justify-end ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#0072BC] hover:bg-[#005E7F] text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70"
              >
                {loading ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Save size={18} /> SIMPAN DATA
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* --- LIST DATA CARD --- */}
        <div className={`rounded-2xl shadow-xl overflow-hidden ${isDarkMode ? "bg-slate-800 shadow-black/30" : "bg-white shadow-blue-900/30"}`}>
          <div className={`px-8 py-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"}`}>
                <Database size={20} />
              </div>
              <h3 className={`font-bold ${isDarkMode ? "text-white" : "text-gray-700"}`}>
                Database Aset Terdaftar
              </h3>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* TOMBOL IMPORT DATA DEFAULT */}
              {assetList.length === 0 && (
                <button
                  onClick={handleImportDefaults}
                  disabled={isImporting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50"
                >
                  {isImporting ? (
                    "Mengimpor..."
                  ) : (
                    <>
                      <UploadCloud size={16} /> IMPORT DATA AWAL
                    </>
                  )}
                </button>
              )}

              <div className="relative w-full md:w-64">
                <Search
                  className={`absolute left-3 top-3 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Cari Aset..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-full border text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white placeholder:text-slate-500" : "border-gray-300 text-gray-800"}`}
                />
              </div>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-10 ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                <tr>
                  <th className={`p-4 text-xs font-bold uppercase text-center w-12 ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    No.
                  </th>
                  <th className={`p-4 text-xs font-bold uppercase ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    Lokasi GI
                  </th>
                  <th className={`p-4 text-xs font-bold uppercase ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    Nama Trafo
                  </th>
                  <th className={`p-4 text-xs font-bold uppercase hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    Merk
                  </th>
                  <th className={`p-4 text-xs font-bold uppercase hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    ULTG
                  </th>
                  <th className={`p-4 text-xs font-bold uppercase hidden lg:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    Tahun Pembuatan
                  </th>
                  <th className={`p-4 text-xs font-bold uppercase text-center ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-gray-100"}`}>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className={`p-12 text-center flex flex-col items-center justify-center gap-2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                    >
                      <AlertCircle size={40} opacity={0.5} />
                      <span className="font-medium">
                        Database Kosong / Tidak Ditemukan
                      </span>
                      <p className="text-xs max-w-md">
                        Belum ada aset terdaftar di sistem. Silakan input manual
                        di atas atau gunakan tombol{" "}
                        <b className="text-green-600">Import Data Awal</b> untuk
                        memuat data standar.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset, index) => (
                    <tr
                      key={asset.id}
                      className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-blue-50/50"}`}
                    >
                      <td className={`p-4 text-sm font-bold text-center ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                        {index + 1}
                      </td>
                      <td className={`p-4 text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-700"}`}>
                        {asset.lokasi_gi}
                      </td>
                      <td className={`p-4 text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                        <div className={`font-bold ${isDarkMode ? "text-[#4FC3F7]" : "text-[#0072BC]"}`}>
                          {asset.nama_trafo}
                        </div>
                        <div className={`text-[10px] md:hidden ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                          {asset.merk}
                        </div>
                      </td>
                      <td className={`p-4 text-sm hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                        {asset.merk}
                      </td>
                      <td className={`p-4 text-sm hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${isDarkMode ? "bg-slate-600 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
                          {asset.unit_ultg || "-"}
                        </span>
                      </td>
                      <td className={`p-4 text-sm hidden lg:table-cell ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={isDarkMode ? "text-slate-500" : "text-gray-400"} />
                          <span className="text-xs font-bold">
                            {asset.tahun_pembuatan || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(asset)}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode ? "bg-blue-900/30 hover:bg-blue-900/50 text-blue-400" : "bg-blue-100 hover:bg-blue-200 text-blue-600"}`}
                            title="Edit Aset"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(asset)}
                            disabled={loadingDelete === asset.id}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? "bg-red-900/30 hover:bg-red-900/50 text-red-400" : "bg-red-100 hover:bg-red-200 text-red-600"}`}
                            title="Hapus Aset"
                          >
                            {loadingDelete === asset.id ? (
                              "..."
                            ) : (
                              <Trash2 size={16} />
                            )}
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

        <div className="text-center text-white/60 text-xs font-medium tracking-wide">
          © 2026 PT PLN (Persero) Unit Pelaksana Transmisi Manado
        </div>
      </motion.div>

      {/* 🔥 DELETE CONFIRMATION MODAL */}
      {showDeleteModal && assetToDelete && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
            <div className="bg-red-500 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Hapus Aset?</h3>
            </div>
            <div className="p-6 text-center">
              <p className={`mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                Anda akan menghapus aset berikut secara permanen:
              </p>
              <div className={`rounded-xl p-4 mb-4 ${isDarkMode ? "bg-slate-700" : "bg-gray-50"}`}>
                <p className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-800"}`}>{assetToDelete.nama_trafo}</p>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{assetToDelete.lokasi_gi}</p>
              </div>

              {/* 🔥 INPUT VERIFIKASI */}
              <div className={`border rounded-xl p-4 mb-4 ${isDarkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}>
                <p className="text-xs text-red-500 font-medium mb-2">
                  ⚠️ Ketik <span className="font-bold">HAPUS</span> untuk mengkonfirmasi:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS di sini..."
                  className={`w-full px-4 py-2 border rounded-lg text-center font-bold focus:ring-2 focus:ring-red-500 outline-none ${isDarkMode ? "bg-slate-900 border-red-800 text-red-400" : "border-red-300 text-red-600"}`}
                />
              </div>

              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                Tindakan ini tidak dapat dibatalkan!
              </p>
            </div>
            <div className={`flex border-t ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAssetToDelete(null);
                  setDeleteConfirmText("");
                }}
                className={`flex-1 py-4 font-bold transition ${isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={loadingDelete || deleteConfirmText.toLowerCase() !== "hapus"}
                className="flex-1 py-4 bg-red-500 text-white hover:bg-red-600 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingDelete ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 EDIT MODAL */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
            <div className="bg-[#0072BC] p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Edit2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Aset Trafo</h3>
                  <p className="text-xs text-white/70">{editFormData.unit_ultg}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditFormData(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Lokasi GI</label>
                  <input
                    type="text"
                    name="lokasi_gi"
                    value={editFormData.lokasi_gi}
                    onChange={handleEditChange}
                    className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Nama Trafo</label>
                  <input
                    type="text"
                    name="nama_trafo"
                    value={editFormData.nama_trafo}
                    onChange={handleEditChange}
                    className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Merk Pabrikan</label>
                <input
                  type="text"
                  name="merk"
                  value={editFormData.merk}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Nomor Seri</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={editFormData.serial_number}
                    onChange={handleEditChange}
                    className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Tahun Pembuatan</label>
                  <input
                    type="text"
                    name="tahun_pembuatan"
                    value={editFormData.tahun_pembuatan}
                    onChange={handleEditChange}
                    className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Level Tegangan</label>
                <select
                  name="level_tegangan"
                  value={editFormData.level_tegangan}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                >
                  <option value="">-- Pilih --</option>
                  <option value="150/20 kV">150/20 kV</option>
                  <option value="150/70 kV">150/70 kV</option>
                  <option value="70/20 kV">70/20 kV</option>
                  <option value="150 kV">150 kV</option>
                  <option value="275 kV">275 kV</option>
                  <option value="70 kV">70 kV</option>
                  <option value="30 kV">30 kV</option>
                </select>
              </div>
            </div>

            <div className={`flex border-t ${isDarkMode ? "border-slate-700 bg-slate-700/50" : "border-gray-100 bg-gray-50"}`}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditFormData(null);
                }}
                className={`flex-1 py-4 font-bold transition ${isDarkMode ? "text-slate-300 hover:bg-slate-600" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Batal
              </button>
              <button
                onClick={confirmEdit}
                disabled={loadingEdit}
                className="flex-1 py-4 bg-[#0072BC] text-white hover:bg-[#005E7F] font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingEdit ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Save size={16} /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
