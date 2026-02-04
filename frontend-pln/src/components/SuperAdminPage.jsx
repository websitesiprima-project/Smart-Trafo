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
  Trash2,
  Search,
  AlertCircle,
  Database,
  Edit2,
  X,
  Loader2, // Icon Loading
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

const API_URL = "http://127.0.0.1:8000";

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
    <label
      className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${isDarkMode ? "text-[#4FC3F7] group-focus-within:text-[#81D4FA]" : "text-[#006C92] group-focus-within:text-[#00A2E9]"}`}
    >
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
  // State untuk Loading
  const [loadingSave, setLoadingSave] = useState(false); // Loading saat simpan
  const [isFetching, setIsFetching] = useState(true); // Loading awal halaman

  // Data State
  const [assetList, setAssetList] = useState([]);
  const [unitMapping, setUnitMapping] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [loadingDelete, setLoadingDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  // 🔥 FUNGSI UTAMA LOAD DATA (DIGABUNG AGAR EFISIEN)
  const loadInitialData = async () => {
    setIsFetching(true);
    try {
      // Jalankan kedua request secara paralel
      const [assetsRes, hierarchyRes] = await Promise.allSettled([
        supabase
          .from("assets_trafo")
          .select("*")
          .order("lokasi_gi", { ascending: true }),
        fetch(`${API_URL}/master/hierarchy`),
      ]);

      // 1. Handle Data Aset (Supabase)
      if (assetsRes.status === "fulfilled" && !assetsRes.value.error) {
        setAssetList(assetsRes.value.data || []);
      } else {
        console.error(
          "Gagal load aset:",
          assetsRes.reason || assetsRes.value.error,
        );
        toast.error("Gagal memuat database aset.");
      }

      // 2. Handle Data Wilayah (API Python)
      if (hierarchyRes.status === "fulfilled" && hierarchyRes.value.ok) {
        const mapping = await hierarchyRes.value.json();
        setUnitMapping(mapping || {});
      } else {
        console.warn("Gagal load hierarchy (Mungkin backend mati).");
        // Jangan tampilkan toast error agar user tidak panik, biarkan dropdown kosong
      }
    } catch (err) {
      console.error("Critical Error Loading Data:", err);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsFetching(false); // Pastikan loading mati apapun yang terjadi
    }
  };

  // Load saat pertama kali buka
  useEffect(() => {
    loadInitialData();
  }, []);

  // --- SORTING HELPER ---
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

  // --- DELETE ASET ---
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

      // Refresh list lokal tanpa fetch ulang (lebih cepat)
      setAssetList((prev) =>
        prev.filter((item) => item.id !== assetToDelete.id),
      );
    } catch (error) {
      toast.error("Gagal menghapus aset.");
    } finally {
      setLoadingDelete(null);
      setShowDeleteModal(false);
      setAssetToDelete(null);
      setDeleteConfirmText("");
    }
  };

  // --- EDIT ASET ---
  const openEditModal = (asset) => {
    setEditFormData({ ...asset });
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

      // Refresh lokal
      setAssetList((prev) =>
        prev.map((item) => (item.id === editFormData.id ? editFormData : item)),
      );

      setShowEditModal(false);
      setEditFormData(null);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui aset.");
    } finally {
      setLoadingEdit(false);
    }
  };

  // --- TAMBAH ASET BARU ---
  const handleAddTrafo = async (e) => {
    e.preventDefault();
    if (!formData.lokasi_gi || !formData.nama_trafo || !formData.merk) {
      toast.error("Mohon lengkapi data wajib!");
      return;
    }
    setLoadingSave(true);
    try {
      const unitName = formData.ultg || "Unknown";
      const { ultg, ...dataToInsert } = formData;

      const { data, error } = await supabase
        .from("assets_trafo")
        .insert([
          {
            ...dataToInsert,
            unit_ultg: unitName,
            status: "Normal",
            op_status: "Operasi",
          },
        ])
        .select();

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

      // Tambahkan ke list lokal langsung
      if (data) setAssetList((prev) => [...prev, ...data]);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setLoadingSave(false);
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
        (item.nama_trafo || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.lokasi_gi || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (item.merk || "").toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  return (
    <div className="w-full min-h-screen relative overflow-x-hidden font-sans pb-20">
      {/* BACKGROUND */}
      <div
        className={`fixed inset-0 z-0 ${isDarkMode ? "bg-[#0f172a]" : "bg-[#00A2E9]"}`}
      >
        <div
          className={`absolute inset-0 ${isDarkMode ? "bg-gradient-to-b from-[#0f172a] to-[#1e293b]" : "bg-gradient-to-b from-[#00A2E9] to-[#0072BC]"}`}
        ></div>
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
        <div
          className={`rounded-2xl shadow-xl overflow-hidden ${isDarkMode ? "bg-slate-800 shadow-black/30" : "bg-white shadow-blue-900/30"}`}
        >
          <div
            className={`px-8 py-5 border-b flex items-center gap-3 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}
          >
            <div
              className={`p-2.5 rounded-xl ${isDarkMode ? "bg-[#1B7A8F]/20 text-[#1B7A8F]" : "bg-[#E1F5FE] text-[#0277BD]"}`}
            >
              <FileText size={24} />
            </div>
            <div>
              <h3
                className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                Registrasi Trafo Baru
              </h3>
            </div>
          </div>

          <form onSubmit={handleAddTrafo} className="p-8">
            <div
              className={`border-2 border-dashed rounded-2xl p-6 mb-8 relative mt-2 ${isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-white border-[#B3E5FC]"}`}
            >
              <div
                className={`absolute -top-3 left-6 px-3 text-xs font-bold text-[#D32F2F] flex items-center gap-2 border rounded-full py-0.5 shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-[#B3E5FC]"}`}
              >
                <MapPin size={14} /> 1. Lokasi Penempatan
              </div>

              {isFetching ? (
                <div className="flex justify-center items-center py-8 opacity-50 gap-2">
                  <Loader2 className="animate-spin" size={20} /> Memuat Data
                  Wilayah...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#4FC3F7]" : "text-[#006C92]"}`}
                    >
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
                        {Object.keys(unitMapping).map((ultgName) => (
                          <option key={ultgName} value={ultgName}>
                            {ultgName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#4FC3F7]" : "text-[#006C92]"}`}
                    >
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
                          unitMapping[formData.ultg]?.map((gi) => (
                            <option key={gi.name} value={gi.name}>
                              {gi.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h4
                  className={`text-sm font-bold border-b-2 border-[#FFD700] pb-2 inline-flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
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
                <h4
                  className={`text-sm font-bold border-b-2 border-[#00A2E9] pb-2 inline-flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
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
                    <label
                      className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? "text-[#4FC3F7]" : "text-[#006C92]"}`}
                    >
                      <Activity size={14} className="text-[#F9A825]" /> Tegangan
                    </label>
                    <div className="relative">
                      <select
                        name="level_tegangan"
                        value={formData.level_tegangan}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer transition ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-[#F8FAFC] border-gray-300 text-gray-800"}`}
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

            <div
              className={`mt-8 pt-6 border-t flex justify-end ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
            >
              <button
                type="submit"
                disabled={loadingSave || isFetching}
                className="bg-[#0072BC] hover:bg-[#005E7F] text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loadingSave ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Menyimpan...
                  </>
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
        <div
          className={`rounded-2xl shadow-xl overflow-hidden ${isDarkMode ? "bg-slate-800 shadow-black/30" : "bg-white shadow-blue-900/30"}`}
        >
          <div
            className={`px-8 py-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"}`}
              >
                <Database size={20} />
              </div>
              <h3
                className={`font-bold ${isDarkMode ? "text-white" : "text-gray-700"}`}
              >
                Database Aset Terdaftar ({assetList.length})
              </h3>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={loadInitialData}
                className="p-2 bg-gray-500/10 rounded-lg hover:bg-gray-500/20"
                title="Refresh Data"
              >
                <RefreshCw
                  size={20}
                  className={isFetching ? "animate-spin" : ""}
                />
              </button>
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
            {isFetching && assetList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center opacity-50 gap-4">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p>Sedang memuat data...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead
                  className={`sticky top-0 z-10 ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}
                >
                  <tr>
                    <th
                      className={`p-4 text-xs font-bold uppercase text-center w-12 ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      No.
                    </th>
                    <th
                      className={`p-4 text-xs font-bold uppercase ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      Lokasi GI
                    </th>
                    <th
                      className={`p-4 text-xs font-bold uppercase ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      Nama Trafo
                    </th>
                    <th
                      className={`p-4 text-xs font-bold uppercase hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      Merk
                    </th>
                    <th
                      className={`p-4 text-xs font-bold uppercase hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      ULTG
                    </th>
                    <th
                      className={`p-4 text-xs font-bold uppercase hidden lg:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      Tahun
                    </th>
                    <th
                      className={`p-4 text-xs font-bold uppercase text-center ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-gray-100"}`}
                >
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className={`p-12 text-center flex flex-col items-center justify-center gap-2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                      >
                        <AlertCircle size={40} opacity={0.5} />
                        <span className="font-medium">
                          Data tidak ditemukan
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset, index) => (
                      <tr
                        key={asset.id}
                        className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-blue-50/50"}`}
                      >
                        <td
                          className={`p-4 text-sm font-bold text-center ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                        >
                          {index + 1}
                        </td>
                        <td
                          className={`p-4 text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-700"}`}
                        >
                          {asset.lokasi_gi}
                        </td>
                        <td
                          className={`p-4 text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                        >
                          <div
                            className={`font-bold ${isDarkMode ? "text-[#4FC3F7]" : "text-[#0072BC]"}`}
                          >
                            {asset.nama_trafo}
                          </div>
                        </td>
                        <td
                          className={`p-4 text-sm hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                        >
                          {asset.merk}
                        </td>
                        <td
                          className={`p-4 text-sm hidden md:table-cell ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
                        >
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${isDarkMode ? "bg-slate-600 text-slate-300" : "bg-gray-100 text-gray-600"}`}
                          >
                            {asset.unit_ultg || "-"}
                          </span>
                        </td>
                        <td
                          className={`p-4 text-sm hidden lg:table-cell ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />{" "}
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
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(asset)}
                              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "bg-red-900/30 hover:bg-red-900/50 text-red-400" : "bg-red-100 hover:bg-red-200 text-red-600"}`}
                              title="Hapus"
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
            )}
          </div>
        </div>

        <div className="text-center text-white/60 text-xs font-medium tracking-wide">
          © 2026 PT PLN (Persero) Unit Pelaksana Transmisi Manado
        </div>
      </motion.div>

      {/* MODAL DELETE */}
      {showDeleteModal && assetToDelete && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            <div className="bg-red-500 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Hapus Aset?</h3>
            </div>
            <div className="p-6 text-center">
              <p
                className={`mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}
              >
                Anda akan menghapus aset berikut:
              </p>
              <div
                className={`rounded-xl p-4 mb-4 ${isDarkMode ? "bg-slate-700" : "bg-gray-50"}`}
              >
                <p
                  className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  {assetToDelete.nama_trafo}
                </p>
                <p
                  className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                >
                  {assetToDelete.lokasi_gi}
                </p>
              </div>
              <div
                className={`border rounded-xl p-4 mb-4 ${isDarkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}
              >
                <p className="text-xs text-red-500 font-medium mb-2">
                  ⚠️ Ketik <span className="font-bold">HAPUS</span>:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg text-center font-bold focus:ring-2 focus:ring-red-500 outline-none ${isDarkMode ? "bg-slate-900 border-red-800 text-red-400" : "border-red-300 text-red-600"}`}
                  placeholder="Ketik HAPUS"
                />
              </div>
            </div>
            <div
              className={`flex border-t ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
            >
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
                disabled={
                  loadingDelete || deleteConfirmText.toLowerCase() !== "hapus"
                }
                className="flex-1 py-4 bg-red-500 text-white hover:bg-red-600 font-bold transition disabled:opacity-50"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            <div className="bg-[#0072BC] p-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit Aset Trafo</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditFormData(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                  >
                    Lokasi GI
                  </label>
                  <input
                    type="text"
                    name="lokasi_gi"
                    value={editFormData.lokasi_gi}
                    onChange={handleEditChange}
                    className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                  >
                    Nama Trafo
                  </label>
                  <input
                    type="text"
                    name="nama_trafo"
                    value={editFormData.nama_trafo}
                    onChange={handleEditChange}
                    className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                  />
                </div>
              </div>
              {/* Field lain sama seperti form tambah */}
              <div className="flex flex-col gap-1.5">
                <label
                  className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                >
                  Merk
                </label>
                <input
                  type="text"
                  name="merk"
                  value={editFormData.merk}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                >
                  Serial Number
                </label>
                <input
                  type="text"
                  name="serial_number"
                  value={editFormData.serial_number}
                  onChange={handleEditChange}
                  className={`w-full px-4 py-3 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-800"}`}
                />
              </div>
              <div
                className={`flex border-t pt-4 ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}
              >
                <button
                  onClick={confirmEdit}
                  disabled={loadingEdit}
                  className="flex-1 py-3 bg-[#0072BC] text-white hover:bg-[#005E7F] font-bold rounded-lg transition disabled:opacity-50"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
