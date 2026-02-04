import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  MapPin,
  Building,
  Shield,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

const API_URL = "http://127.0.0.1:8000";

export default function UserManagementPage({ session, isDarkMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "admin_unit",
    unit_ultg: "", // 🔥 KOSONGKAN DEFAULT (Agar diisi manual)
  });

  // Fetch Users dari tabel Profiles
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        // 🔥 FIX SORTING (Ganti 'created_at' jadi 'email' karena created_at mungkin null)
        .order("email", { ascending: true });

      if (error) throw error;
      setUsers(data);
    } catch (err) {
      toast.error("Gagal memuat user: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validasi Manual
    if (!newUser.unit_ultg.trim() && newUser.role === "admin_unit") {
      return toast.error("Wajib mengisi Nama Unit/Wilayah untuk Admin Unit!");
    }

    const toastId = toast.loading("Mendaftarkan user & wilayah baru...");

    try {
      const payload = {
        ...newUser,
        requester_email: session.user.email,
        // Jika role Super Admin, unit_ultg bisa null atau "Kantor Induk"
        unit_ultg:
          newUser.role === "super_admin" ? "Kantor Induk" : newUser.unit_ultg,
      };

      const res = await fetch(`${API_URL}/admin/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.status !== "Sukses") throw new Error(data.msg);

      toast.success(
        `User ${newUser.email} (Unit: ${payload.unit_ultg}) berhasil dibuat!`,
        { id: toastId },
      );
      setShowModal(false);
      setNewUser({
        email: "",
        password: "",
        role: "admin_unit",
        unit_ultg: "",
      });
      fetchUsers(); // Refresh list
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Yakin ingin menghapus user ${userEmail}?`)) return;

    const toastId = toast.loading("Menghapus user...");
    try {
      const res = await fetch(
        `${API_URL}/admin/delete-user/${userId}?requester_email=${session.user.email}`,
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

  return (
    <div
      className={`p-6 min-h-screen ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-[#1B7A8F]" /> Manajemen Pengguna & Wilayah
          </h1>
          <p className="text-sm opacity-60">
            Daftarkan Admin Unit baru untuk membuka wilayah operasional baru.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1B7A8F] hover:bg-[#155e6e] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg"
        >
          <UserPlus size={18} /> Tambah User Baru
        </button>
      </div>

      {/* User List Table */}
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
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-500/5 transition`}
                  >
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${user.role === "super_admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}
                        >
                          {user.email[0].toUpperCase()}
                        </div>
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === "super_admin" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}
                      >
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <MapPin size={14} className="opacity-50" />
                      {user.unit_ultg || "Global Access"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs opacity-50">
                      {user.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.email !== session.user.email && (
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

      {/* MODAL TAMBAH USER */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all scale-100 ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Registrasi User & Unit Baru</h3>
              <button
                onClick={() => setShowModal(false)}
                className="opacity-50 hover:opacity-100"
              >
                <Users size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                  Email Login
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: ultgtahuna@gmail.com"
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-gray-200"}`}
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#1B7A8F] ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-gray-200"}`}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                    Role
                  </label>
                  <select
                    className={`w-full p-3 rounded-xl border outline-none ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-gray-200"}`}
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="admin_unit">Admin Unit</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                    Nama Unit Baru
                  </label>

                  {/* 🔥 INI YANG BERUBAH: INPUT TEXT UNTUK NAMA WILAYAH BARU */}
                  <input
                    type="text"
                    className={`w-full p-3 rounded-xl border outline-none ${
                      newUser.role === "super_admin"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    } ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-gray-200"}`}
                    placeholder="Contoh: Tahuna"
                    value={newUser.unit_ultg}
                    onChange={(e) =>
                      setNewUser({ ...newUser, unit_ultg: e.target.value })
                    }
                    disabled={newUser.role === "super_admin"}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-gray-500/10 hover:bg-gray-500/20 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1B7A8F] hover:bg-[#155e6e] transition shadow-lg"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
