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
} from "lucide-react";
import { motion } from "framer-motion";

// Import Data
import { ultgData, trafoDatabase } from "../data/assetData";

// ============================================================================
// 🔥 PERBAIKAN: KOMPONEN INPUTDIPINDAHKAN KE LUAR (AGAR TIDAK HILANG FOKUS)
// ============================================================================
const PLNInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
}) => (
  <div className="flex flex-col gap-1.5 group">
    <label className="text-xs font-bold text-[#006C92] uppercase tracking-wider flex items-center gap-1 group-focus-within:text-[#00A2E9] transition-colors">
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
      className="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:ring-2 focus:ring-[#00A2E9] focus:border-[#00A2E9] focus:bg-white outline-none transition-all shadow-sm placeholder:text-gray-400/70"
    />
  </div>
);

const SuperAdminPage = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [assetList, setAssetList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDelete, setLoadingDelete] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const [formData, setFormData] = useState({
    ultg: "",
    lokasi_gi: "",
    nama_trafo: "",
    merk: "",
    serial_number: "",
    tahun_pembuatan: "",
    level_tegangan: "",
  });

  // --- FUNGSI UNTUK MENGURUTKAN TRAFO ---
  const sortTrafos = (trafos) => {
    return [...trafos].sort((a, b) => {
      const aName = a.nama_trafo || "";
      const bName = b.nama_trafo || "";

      // Extract tipe (TD, GT, IBT, dll) dan nomor
      const aMatch = aName.match(/^([A-Z]+)\s*#?(\d+)$/i);
      const bMatch = bName.match(/^([A-Z]+)\s*#?(\d+)$/i);

      if (!aMatch || !bMatch) return aName.localeCompare(bName);

      const aType = aMatch[1].toUpperCase();
      const bType = bMatch[1].toUpperCase();
      const aNum = parseInt(aMatch[2], 10);
      const bNum = parseInt(bMatch[2], 10);

      // Urutan prioritas: TD, GT, IBT, lainnya
      const typeOrder = { TD: 1, GT: 2, IBT: 3 };
      const aOrder = typeOrder[aType] || 999;
      const bOrder = typeOrder[bType] || 999;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return aNum - bNum;
    });
  };

  // --- 1. FETCH DATA ASET ---
  const fetchAssets = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/assets");
      const data = await res.json();
      setAssetList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal ambil data aset", error);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // --- 2. FITUR IMPORT DATA ---
  const handleImportDefaults = async () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin mengimpor semua data dari 'assetData.js' ke Database? Ini mungkin memakan waktu beberapa detik."
      )
    )
      return;

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const [giName, trafos] of Object.entries(trafoDatabase)) {
        for (const t of trafos) {
          const payload = {
            nama_trafo: t.name,
            lokasi_gi: giName,
            merk: t.merk || "-",
            serial_number: t.sn || "-",
            tahun_pembuatan: t.year || "-",
            level_tegangan: t.volt || "-",
            user_email: session?.user?.email || "system_import",
          };

          try {
            await fetch("http://127.0.0.1:8000/assets/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            successCount++;
          } catch (e) {
            console.error("Gagal import:", t.name, e);
            failCount++;
          }
        }
      }
      toast.success(
        `Import Selesai! Sukses: ${successCount}, Gagal: ${failCount}`
      );
      fetchAssets();
    } catch (error) {
      toast.error("Terjadi kesalahan sistem saat import.");
    } finally {
      setIsImporting(false);
    }
  };

  // --- 3. DELETE ASET ---
  const handleDelete = async (id, nama) => {
    if (
      !window.confirm(
        `Yakin ingin menghapus aset master "${nama}"? Data ini akan hilang permanen dari sistem.`
      )
    )
      return;

    setLoadingDelete(id);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assets/delete/${id}?user_email=${session?.user?.email}`,
        {
          method: "DELETE",
        }
      );
      const result = await res.json();

      if (result.status === "Sukses") {
        toast.success(result.msg);
        fetchAssets();
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      toast.error("Gagal menghapus aset.");
    } finally {
      setLoadingDelete(null);
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

  const handleAddTrafo = async (e) => {
    e.preventDefault();
    if (!formData.lokasi_gi || !formData.nama_trafo || !formData.merk) {
      toast.error("Mohon lengkapi data wajib (GI, Nama Trafo, Merk)!");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/assets/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          serial_number: formData.serial_number || "-",
          tahun_pembuatan: formData.tahun_pembuatan || "-",
          level_tegangan: formData.level_tegangan || "-",
          user_email: session?.user?.email,
        }),
      });
      const result = await response.json();
      if (result.status === "Sukses") {
        toast.success("Aset berhasil didaftarkan.");
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
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      toast.error("Gagal koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = sortTrafos(
    assetList.filter(
      (item) =>
        item.nama_trafo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lokasi_gi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.merk.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="w-full min-h-screen relative overflow-x-hidden font-sans pb-20">
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-[#00A2E9]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00A2E9] to-[#0072BC]"></div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 14.018-1.454 21.184-4.063l1.768-.662C33.251 5.346 38.627 4 50 4c11.33 0 16.33 1.26 26.231 5.22 1.096.438 2.228.891 3.42 1.378.895.367 1.83.743 2.801 1.127C86.72 13.43 91.87 14.5 100 14.5V16c-10.51 0-17.75-1.574-27.76-5.52l-1.39-.567C60.77 5.924 56.666 5 50 5c-8.832 0-14.283 1.29-21.38 3.93l-1.767.662C19.72 12.25 14.53 13.5 0 13.5V14z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 12px",
          }}
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
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/30 overflow-hidden">
          <div className="bg-white px-8 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2.5 bg-[#E1F5FE] rounded-xl text-[#0277BD]">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">
                Registrasi Trafo Baru
              </h3>
            </div>
          </div>

          <form onSubmit={handleAddTrafo} className="p-8">
            <div className="bg-white border-2 border-dashed border-[#B3E5FC] rounded-2xl p-6 mb-8 relative mt-2">
              <div className="absolute -top-3 left-6 bg-white px-3 text-xs font-bold text-[#D32F2F] flex items-center gap-2 border border-[#B3E5FC] rounded-full py-0.5 shadow-sm">
                <MapPin size={14} /> 1. Lokasi Penempatan
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#006C92] uppercase tracking-wider">
                    Unit Pelaksana (ULTG)
                  </label>
                  <div className="relative">
                    <select
                      name="ultg"
                      value={formData.ultg}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer transition"
                    >
                      <option value="">-- Pilih ULTG --</option>
                      {Object.entries(ultgData).map(([key, data]) => (
                        <option key={key} value={key}>
                          {data.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#006C92] uppercase tracking-wider">
                    Gardu Induk (GI)
                  </label>
                  <div className="relative">
                    <select
                      name="lokasi_gi"
                      value={formData.lokasi_gi}
                      onChange={handleChange}
                      disabled={!formData.ultg}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 transition"
                    >
                      <option value="">-- Pilih GI --</option>
                      {formData.ultg &&
                        ultgData[formData.ultg]?.gis.map((gi) => (
                          <option key={gi.name} value={gi.name}>
                            {gi.name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h4 className="text-sm font-bold text-gray-800 border-b-2 border-[#FFD700] pb-2 inline-flex items-center gap-2">
                  <Tag size={18} className="text-[#F9A825]" /> 2. Identitas Unit
                </h4>
                <PLNInput
                  label="Kode Bay / Trafo"
                  icon={<Zap />}
                  name="nama_trafo"
                  value={formData.nama_trafo}
                  onChange={handleChange}
                  placeholder="Contoh: IBT #2"
                />
                <PLNInput
                  label="Merk Pabrikan"
                  icon={<Building2 />}
                  name="merk"
                  value={formData.merk}
                  onChange={handleChange}
                  placeholder="Contoh: UNINDO"
                />
              </div>
              <div className="space-y-5">
                <h4 className="text-sm font-bold text-gray-800 border-b-2 border-[#00A2E9] pb-2 inline-flex items-center gap-2">
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
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#006C92] uppercase tracking-wider flex items-center gap-1">
                      <Activity size={14} className="text-[#F9A825]" /> Tegangan
                    </label>
                    <div className="relative">
                      <select
                        name="level_tegangan"
                        value={formData.level_tegangan}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:ring-2 focus:ring-[#00A2E9] outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- Pilih --</option>
                        <option value="150/20 kV">150/20 kV</option>
                        <option value="150/70 kV">150/70 kV</option>
                        <option value="70/20 kV">70/20 kV</option>
                        <option value="150 kV">150 kV</option>
                        <option value="275 kV">275 kV</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                        size={16}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
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
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/30 overflow-hidden">
          <div className="bg-gray-50 px-8 py-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <Database size={20} />
              </div>
              <h3 className="font-bold text-gray-700">
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
                  className="absolute left-3 top-3 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Cari Aset..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                    Lokasi GI
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                    Nama Trafo
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">
                    Merk
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">
                    S/N
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2"
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
                  filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="p-4 text-sm font-bold text-gray-700">
                        {asset.lokasi_gi}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="font-bold text-[#0072BC]">
                          {asset.nama_trafo}
                        </div>
                        <div className="text-[10px] text-gray-400 md:hidden">
                          {asset.merk}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 hidden md:table-cell">
                        {asset.merk}
                      </td>
                      <td className="p-4 text-sm text-gray-600 hidden md:table-cell font-mono">
                        {asset.serial_number}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() =>
                            handleDelete(asset.id, asset.nama_trafo)
                          }
                          disabled={loadingDelete === asset.id}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus Aset Ini"
                        >
                          {loadingDelete === asset.id ? (
                            "..."
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
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
    </div>
  );
};

export default SuperAdminPage;
