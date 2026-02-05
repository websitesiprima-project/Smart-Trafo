import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  MapPin,
  Shield,
  Zap,
  Loader2,
  Mail,
  Lock,
  Box,
  Save, // ✅ IMPORT WAJIB: Agar tidak crash "Save is not defined"
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

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    const { email, password, role, unitName } = formData;

    if (role === "admin_unit" && !unitName.trim()) {
      toast.error("Nama Unit wajib diisi untuk Admin Unit!");
      setSubmitting(false);
      return;
    }

    try {
      // A. Buat User Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        // Jika user sudah ada, authError.message biasanya "User already registered"
        if (authError.message.includes("registered")) {
          throw new Error("Email ini sudah terdaftar sebagai user.");
        }
        throw authError;
      }

      if (!authData.user) throw new Error("Gagal membuat user auth");

      const userId = authData.user.id;

      // B. Simpan Profile (Gunakan UPSERT untuk mengatasi Error 409 Conflict)
      // Upsert = Insert if new, Update if exists
      const { error: profileError } = await supabase.from("profiles").upsert(
        [
          {
            id: userId,
            email: email,
            role: role,
            unit_ultg: role === "super_admin" ? "Kantor Induk" : unitName,
          },
        ],
        { onConflict: "id" },
      ); // Kunci unik adalah ID

      if (profileError) throw profileError;

      // C. Simpan Master ULTG (Hanya untuk Admin Unit)
      if (role === "admin_unit") {
        const { error: ultgError } = await supabase
          .from("master_ultg")
          .insert([{ nama_ultg: unitName }]);

        // Abaikan error 23505 (Unique Violation) jika Unit sudah ada
        if (ultgError && ultgError.code !== "23505") {
          throw ultgError;
        }
      }

      toast.success(`Sukses! User ${email} berhasil diproses.`);
      setShowModal(false);
      setFormData({
        email: "",
        password: "",
        role: "admin_unit",
        unitName: "",
      });
      fetchUsers();
    } catch (error) {
      toast.error("Gagal: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Yakin ingin menghapus user ${userEmail}?`)) return;

    const requesterEmail = session?.user?.email;
    if (!requesterEmail) {
      toast.error("Sesi habis. Refresh halaman.");
      return;
    }

    const toastId = toast.loading("Menghapus user...");
    try {
      const res = await fetch(
        `${API_URL}/admin/delete-user/${userId}?requester_email=${requesterEmail}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);

      toast.success("User dihapus", { id: toastId });
      fetchUsers();
    } catch (err) {
      toast.error(err.message, { id: toastId });
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
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Hapus User"
                        >
                          <Trash2 size={16} />
                        </button>
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
                        type="password"
                        required
                        name="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        minLength={6}
                        className={`w-full pl-10 p-3 rounded-lg border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-600" : "bg-slate-50 border-gray-200"}`}
                        placeholder="••••••••"
                      />
                    </div>
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
                        placeholder="CONTOH: ULTG LOPANA"
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
    </div>
  );
}
