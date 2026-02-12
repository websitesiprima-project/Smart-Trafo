import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  MapPin,
  Shield,
  Zap,
  Loader2,
  Lock,
  Box,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  XCircle,
  Mail,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

// URL API Backend
const API_URL = "http://127.0.0.1:8000";

export default function UserManagementPage({ session, isDarkMode = true }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    email: "",
    role: "",
    unitName: "",
    password: "",
    confirmPassword: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin_unit",
    unitName: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("email", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      toast.error("Gagal memuat user: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateComplete = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { email, password, confirmPassword, role, unitName } = formData;

    // Validasi Email harus @pln.co.id
    if (!email.endsWith("@pln.co.id")) {
      toast.error("Email harus menggunakan domain @pln.co.id!");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password dan Konfirmasi Password tidak cocok!");
      setSubmitting(false);
      return;
    }

    if (role === "admin_unit" && !unitName.trim()) {
      toast.error("Nama Unit wajib diisi untuk Admin Unit!");
      setSubmitting(false);
      return;
    }

    try {
      // A. Buat User via Backend API (TIDAK mengirim email verifikasi)
      const requesterEmail = session?.user?.email;
      if (!requesterEmail) {
        throw new Error("Sesi habis. Refresh halaman.");
      }

      const res = await fetch(`${API_URL}/admin/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          role: role,
          unit_ultg: role === "super_admin" ? "Kantor Induk" : unitName,
          requester_email: requesterEmail,
        }),
      });

      const data = await res.json();
      
      if (data.status !== "Sukses") {
        throw new Error(data.msg || "Gagal membuat user");
      }

      // B. Buat Master ULTG jika Admin Unit (via Backend API)
      if (role === "admin_unit") {
        try {
          await fetch(`${API_URL}/admin/master/add-ultg`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nama_ultg: unitName,
              requester_email: requesterEmail,
            }),
          });
          // Ignore jika ULTG sudah ada
        } catch (e) {
          console.log("ULTG sudah ada atau gagal dibuat:", e);
        }
      }

      toast.success(data.msg || `User ${email} berhasil dibuat!`);
      setShowModal(false);
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        role: "admin_unit",
        unitName: "",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      fetchUsers();
    } catch (error) {
      toast.error("Gagal: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Function to open delete confirmation modal
  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  // Function to close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setDeleteConfirmText("");
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const requesterEmail = session?.user?.email;
    if (!requesterEmail) {
      toast.error("Sesi habis. Refresh halaman.");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("Menghapus user dan data terkait...");
    try {
      const res = await fetch(
        `${API_URL}/admin/delete-user/${userToDelete.id}?requester_email=${requesterEmail}&unit_ultg=${encodeURIComponent(userToDelete.unit_ultg || "")}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);

      toast.success(data.msg || "User dan data terkait berhasil dihapus", { id: toastId });
      closeDeleteModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to open edit user modal
  const openEditModal = (user) => {
    setUserToEdit(user);
    setEditFormData({
      email: user.email || "",
      role: user.role || "admin_unit",
      unitName: user.unit_ultg || "",
      password: "",
      confirmPassword: "",
    });
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
    setShowEditModal(true);
  };

  // Function to close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setUserToEdit(null);
    setEditFormData({
      email: "",
      role: "",
      unitName: "",
      password: "",
      confirmPassword: "",
    });
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
  };

  // Function to handle edit user submit
  const handleEditUser = async () => {
    if (!userToEdit) return;

    const requesterEmail = session?.user?.email;
    if (!requesterEmail) {
      toast.error("Sesi habis. Refresh halaman.");
      return;
    }

    // Validasi email domain
    if (editFormData.email && !editFormData.email.endsWith("@pln.co.id")) {
      toast.error("Email harus menggunakan domain @pln.co.id!");
      return;
    }

    // Validasi password jika diisi
    if (editFormData.password) {
      if (editFormData.password.length < 6) {
        toast.error("Password minimal 6 karakter!");
        return;
      }
      if (editFormData.password !== editFormData.confirmPassword) {
        toast.error("Password dan Konfirmasi Password tidak cocok!");
        return;
      }
    }

    // Validasi unit untuk admin_unit
    if (editFormData.role === "admin_unit" && !editFormData.unitName.trim()) {
      toast.error("Nama Unit wajib diisi untuk Admin Unit!");
      return;
    }

    setIsUpdating(true);
    const toastId = toast.loading("Mengupdate data user...");

    try {
      const res = await fetch(`${API_URL}/admin/update-user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_id: userToEdit.id,
          new_email: editFormData.email !== userToEdit.email ? editFormData.email : "",
          new_role: editFormData.role !== userToEdit.role ? editFormData.role : "",
          new_unit_ultg: editFormData.role === "super_admin" 
            ? "Kantor Induk" 
            : (editFormData.unitName !== userToEdit.unit_ultg ? editFormData.unitName : ""),
          new_password: editFormData.password || "",
          requester_email: requesterEmail,
        }),
      });

      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);

      toast.success(data.msg || "User berhasil diupdate!", { id: toastId });
      closeEditModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentUserEmail = session?.user?.email;

  return (
    <div
      className={`p-6 min-h-screen ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-[#1B7A8F]" /> Manajemen Pengguna & Wilayah
          </h1>
          <p className="text-sm opacity-60">
            Pembuatan akun Admin Unit akan otomatis membuat wilayah kerja (ULTG)
            baru.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1B7A8F] hover:bg-[#155e6e] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg hover:shadow-[#1B7A8F]/20"
        >
          <UserPlus size={18} /> Tambah User & Unit
        </button>
      </div>

      <div
        className={`rounded-xl shadow-sm border overflow-hidden ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className={`uppercase font-bold tracking-wider ${isDarkMode ? "bg-slate-900/50 text-slate-400" : "bg-slate-50 text-slate-500"}`}
            >
              <tr>
                <th className="px-6 py-4">Email / Akun</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Unit / Wilayah</th>
                <th className="px-6 py-4">ID System</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center opacity-50">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center opacity-50">
                    Belum ada user lain.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-500/5 transition">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${user.role === "super_admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}
                        >
                          {user.email ? user.email[0].toUpperCase() : "U"}
                        </div>
                        {user.email || "No Email"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          user.role === "super_admin"
                            ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        }`}
                      >
                        {user.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <MapPin size={14} className="opacity-50" />
                      <span className="font-semibold">
                        {user.unit_ultg || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs opacity-50">
                      {user.id ? user.id.slice(0, 8) : "???"}...
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.email !== currentUserEmail && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                            title="Edit User"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            title="Hapus User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRASI GABUNGAN */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            <div
              className={`md:hidden p-4 border-b ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}
            >
              <h3 className="font-bold">Registrasi User & Unit</h3>
            </div>

            <form
              onSubmit={handleCreateComplete}
              className="flex-1 flex flex-col md:flex-row"
            >
              {/* KOLOM KIRI: INFO AKUN */}
              <div
                className={`flex-1 p-8 border-r ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}
              >
                <h3 className="text-lg font-bold text-[#1B7A8F] mb-6 flex items-center gap-2">
                  <Shield size={20} /> Data Kredensial
                </h3>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                      Email Korporat
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-3 text-slate-500"
                        size={18}
                      />
                      <input
                        type="email"
                        required
                        name="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className={`w-full pl-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                        placeholder="manager@pln.co.id"
                      />
                    </div>
                    <p className="text-[13px] font-bold opacity-50 mt-1">
                      ⚠️ Hanya email dengan domain <b>@pln.co.id</b> yang diterima
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-3 text-slate-500"
                        size={18}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        name="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        minLength={6}
                        className={`w-full pl-10 pr-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 transition"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-[13px] font-bold opacity-50 mt-1">Minimal 6 karakter</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                      Konfirmasi Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-3 text-slate-500"
                        size={18}
                      />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        minLength={6}
                        className={`w-full pl-10 pr-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 transition"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-[13px] font-bold text-red-500 mt-1 flex items-center gap-1">
                        <span>⚠</span> Password tidak cocok
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                      Role Akses
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      className={`w-full p-3 rounded-lg border outline-none ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                    >
                      <option value="admin_unit">
                        Admin Unit (Manager ULTG)
                      </option>
                      <option value="super_admin">Super Admin (Pusat)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: INFO UNIT */}
              <div
                className={`flex-1 p-8 relative overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-slate-50"}`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Zap size={180} />
                </div>

                <h3 className="text-lg font-bold text-[#FFD700] mb-6 flex items-center gap-2 relative z-10">
                  <Box size={20} /> Data Unit / Wilayah
                </h3>

                <div className="space-y-5 relative z-10">
                  <div
                    className={`p-4 rounded-lg text-xs leading-relaxed border ${isDarkMode ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-200" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}
                  >
                    Info: Jika Anda memilih role <b>Admin Unit</b>, sistem akan
                    otomatis membuat <b>Kelompok Unit Baru</b> di Peta Aset
                    sesuai nama di bawah ini.
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                      Nama Unit ULTG
                    </label>
                    <div className="relative">
                      <Box
                        className="absolute left-3 top-3 text-slate-500"
                        size={18}
                      />
                      <input
                        type="text"
                        name="unitName"
                        value={formData.unitName}
                        onChange={(e) =>
                          setFormData({ ...formData, unitName: e.target.value })
                        }
                        disabled={formData.role === "super_admin"}
                        className={`w-full pl-10 p-3 rounded-lg border outline-none font-bold placeholder-opacity-50 ${
                          formData.role === "super_admin"
                            ? "opacity-50 cursor-not-allowed"
                            : "focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]"
                        } ${isDarkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-200"}`}
                        placeholder="CONTOH: Lopana"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-3 relative z-10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl font-bold bg-gray-500/10 hover:bg-gray-500/20 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#1B7A8F] to-[#155e6e] hover:shadow-lg hover:shadow-[#1B7A8F]/30 transition flex justify-center items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Simpan User & Unit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            {/* Header dengan ikon peringatan */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={36} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Konfirmasi Hapus User</h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Info User */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${userToDelete.role === "super_admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                    {userToDelete.email ? userToDelete.email[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="font-bold">{userToDelete.email}</p>
                    <p className="text-sm opacity-60 flex items-center gap-1">
                      <MapPin size={12} /> {userToDelete.unit_ultg || "Tidak ada ULTG"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              {userToDelete.unit_ultg && userToDelete.unit_ultg !== "Kantor Induk" && (
                <div className={`p-4 rounded-xl border-2 border-dashed ${isDarkMode ? "bg-red-900/20 border-red-500/50 text-red-300" : "bg-red-50 border-red-300 text-red-700"}`}>
                  <div className="flex gap-3">
                    <XCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold mb-1">⚠️ Peringatan Penting!</p>
                      <p>
                        Jika Anda hapus user dengan ULTG <b className="text-red-500">"{userToDelete.unit_ultg}"</b>, 
                        maka <b>SELURUH Gardu Induk (GI)</b> yang terdaftar di bawah ULTG ini akan <b>ikut terhapus secara permanen</b>, 
                        termasuk <b>pin lokasi di peta dashboard</b>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Input */}
              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-2">
                  Ketik "<span className="text-red-500">HAPUS {userToDelete.unit_ultg}</span>" untuk konfirmasi (huruf besar semua)
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`HAPUS ${userToDelete.unit_ultg.toUpperCase()}`}
                  className={`w-full p-3 rounded-lg border-2 outline-none transition text-center font-semibold text-lg tracking-wide ${
                      deleteConfirmText === `HAPUS ${userToDelete.unit_ultg.toUpperCase()}` 
                        ? "border-green-500 focus:ring-2 focus:ring-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-500"
                      : deleteConfirmText.length > 0
                      ? "border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      : `focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-300"}`
                  }`}
                  style={{ textTransform: "none" }}
                />
                {deleteConfirmText.length > 0 && (
                  <p className={`text-xs mt-2 font-medium ${
                    deleteConfirmText === `HAPUS ${userToDelete.unit_ultg.toUpperCase()}`
                      ? "text-green-900 dark:text-green-500"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {deleteConfirmText === `HAPUS ${userToDelete.unit_ultg.toUpperCase()}`
                      ? "✓ Teks valid, tombol hapus aktif"
                      : "✗ Teks tidak sesuai, pastikan huruf besar semua"}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-200 hover:bg-slate-300"}`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteConfirmText !== `HAPUS ${userToDelete.unit_ultg.toUpperCase()}` || isDeleting}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition flex justify-center items-center gap-2 ${
                    deleteConfirmText === `HAPUS ${userToDelete.unit_ultg.toUpperCase()}` && !isDeleting
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-500/30"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isDeleting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B7A8F] to-[#155e6e] p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit3 size={36} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Edit Data User</h3>
              <p className="text-white/70 text-sm mt-1">{userToEdit.email}</p>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                  Email Korporat
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className={`w-full pl-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                    placeholder="manager@pln.co.id"
                  />
                </div>
                <p className="text-[11px] opacity-50 mt-1">⚠️ Hanya domain @pln.co.id</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                  Role Akses
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className={`w-full p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                >
                  <option value="admin_unit">Admin Unit (Manager ULTG)</option>
                  <option value="super_admin">Super Admin (Pusat)</option>
                </select>
              </div>

              {/* Unit ULTG */}
              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                  Nama Unit ULTG
                </label>
                <div className="relative">
                  <Box className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="text"
                    value={editFormData.role === "super_admin" ? "Kantor Induk" : editFormData.unitName}
                    onChange={(e) => setEditFormData({ ...editFormData, unitName: e.target.value })}
                    disabled={editFormData.role === "super_admin"}
                    className={`w-full pl-10 p-3 rounded-lg border outline-none font-bold ${
                      editFormData.role === "super_admin"
                        ? "opacity-50 cursor-not-allowed"
                        : "focus:ring-2 focus:ring-[#1B7A8F]"
                    } ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                    placeholder="Contoh: Lopana"
                  />
                </div>
                {/* Warning jika nama ULTG berubah */}
                {editFormData.role !== "super_admin" && editFormData.unitName && userToEdit?.unit_ultg && editFormData.unitName !== userToEdit.unit_ultg && (
                  <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2 ${isDarkMode ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Mengubah nama ULTG akan otomatis memperbarui: <b>Manajemen Unit</b>, <b>Kelola Aset</b>, dan <b>semua user</b> dengan ULTG "{userToEdit.unit_ultg}".
                    </span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className={`border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"} pt-4`}>
                <p className={`text-xs font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
                  <Lock size={14} /> Ganti Password (Opsional)
                </p>
                
                {/* New Password */}
                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                    Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      minLength={6}
                      className={`w-full pl-10 pr-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                      placeholder="Kosongkan jika tidak ingin diubah"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 transition"
                    >
                      {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editFormData.password && editFormData.password.length < 6 && (
                    <p className="text-[11px] text-red-500 mt-1">⚠️ Minimal 6 karakter</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input
                      type={showEditConfirmPassword ? "text" : "password"}
                      value={editFormData.confirmPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                      minLength={6}
                      disabled={!editFormData.password}
                      className={`w-full pl-10 pr-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${
                        !editFormData.password ? "opacity-50 cursor-not-allowed" : ""
                      } ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                      placeholder="Ulangi password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                      disabled={!editFormData.password}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 transition disabled:opacity-50"
                    >
                      {showEditConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editFormData.password && editFormData.confirmPassword && editFormData.password !== editFormData.confirmPassword && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <XCircle size={12} /> Password tidak cocok
                    </p>
                  )}
                  {editFormData.password && editFormData.confirmPassword && editFormData.password === editFormData.confirmPassword && (
                    <p className="text-[11px] text-green-500 mt-1">✓ Password cocok</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isUpdating}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-200 hover:bg-slate-300"}`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleEditUser}
                  disabled={isUpdating || (editFormData.password && editFormData.password !== editFormData.confirmPassword)}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition flex justify-center items-center gap-2 ${
                    isUpdating || (editFormData.password && editFormData.password !== editFormData.confirmPassword)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#1B7A8F] to-[#155e6e] hover:shadow-lg hover:shadow-[#1B7A8F]/30"
                  }`}
                >
                  {isUpdating ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
