"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import {
  LayoutDashboard,
  History,
  BookOpen,
  Zap,
  LogOut,
  FileText,
  TrendingUp,
  ArrowLeft,
  Trash2,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";

// --- IMPORT SUPABASE & LOGIN ---
import { supabase } from "./lib/supabaseClient";
import LoginPage from "./components/LoginPage";

// --- KOMPONEN RINGAN ---
import PageTransition from "./components/PageTransition";
import LoadingScreen from "./components/LoadingScreen";
import VoltyAssistant from "./components/VoltyAssistant";
import ThemeToggle from "./components/ThemeToggle";

// --- KOMPONEN BERAT (LAZY LOAD) ---
const DashboardPage = lazy(() => import("./components/DashboardPage"));
const InputFormPage = lazy(() => import("./components/InputFormPage"));
const TrendingPage = lazy(() => import("./components/TrendingPage"));
const HistoryPage = lazy(() => import("./components/HistoryPage"));
const GuidePage = lazy(() => import("./components/GuidePage"));
const LandingPage = lazy(() => import("./components/LandingPage"));
const SuperAdminPage = lazy(() => import("./components/SuperAdminPage"));

const ENABLE_AUTH = true;

export default function Home() {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(ENABLE_AUTH);

  // 🔥 STATE ROLE & UNIT
  const [userRole, setUserRole] = useState(null);
  const [userUnit, setUserUnit] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [activeField, setActiveField] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    no_dokumen: "-",
    merk_trafo: "",
    serial_number: "",
    level_tegangan: "",
    mva: "",
    tahun_pembuatan: "",
    lokasi_gi: "",
    nama_trafo: "",
    jenis_minyak: "",
    tanggal_sampling: new Date().toISOString().split("T")[0],
    suhu_sampel: 0,
    diambil_oleh: "",
    h2: 0,
    ch4: 0,
    c2h2: 0,
    c2h4: 0,
    c2h6: 0,
    co: 0,
    co2: 0,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const API_URL = "http://127.0.0.1:8000";

  // ===============================================
  // 🔥 1. LOGIC AUTH YANG DIPERBAIKI (ANTI STUCK) 🔥
  // ===============================================
  useEffect(() => {
    let mounted = true;

    // Fungsi Ambil Profil (Terpisah agar bisa dipanggil ulang)
    const fetchProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, unit_ultg")
          .eq("id", userId)
          .single();

        if (data && mounted) {
          setUserRole(data.role);
          setUserUnit(data.unit_ultg);
          console.log("Profile Loaded:", data.role);
        }
      } catch (err) {
        console.warn("Profile fetch warning:", err);
      }
    };

    const initAuth = async () => {
      try {
        // Cek Environment
        if (!ENABLE_AUTH) {
          setSession({ user: { email: "dev@pln.co.id", id: "dev-mode" } });
          setUserRole("super_admin");
          setAuthChecking(false);
          return;
        }

        // Cek Session Saat Ini
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (mounted) {
          if (session) {
            setSession(session);
            // Tunggu profil terambil SEBELUM mematikan loading
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        // 🔥 KUNCI: Matikan loading apapun yang terjadi
        if (mounted) setAuthChecking(false);
      }
    };

    initAuth();

    // Listener jika user login/logout di tab lain atau expired
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setUserRole(null);
          setUserUnit(null);
        }
        setAuthChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- ACTIONS ---
  const handleLogout = async () => setShowLogoutModal(true);

  // --- FUNGSI LOGOUT (VERSI BERSIH & FIXED DUPLICATE) ---
  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      if (ENABLE_AUTH) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      // Nuklir: Hapus semua sisa data di browser
      localStorage.clear();
      sessionStorage.clear();

      setSession(null);
      setUserRole(null);
      setUserUnit(null);
      setShowLogin(false);

      toast.success("Berhasil keluar akun.");
      // Optional: Force reload agar bersih total
      // window.location.reload();
    }
  };

  const handleDeleteAllHistory = async () => setShowDeleteAllModal(true);

  const confirmDeleteAll = async () => {
    try {
      setLoadingHistory(true);
      if (userRole !== "super_admin" && userRole !== "admin") {
        toast.error("Anda tidak memiliki izin menghapus data.");
        setLoadingHistory(false);
        setShowDeleteAllModal(false);
        return;
      }

      // Hapus lewat API Backend Python (karena backend handle audit log)
      // Atau bisa langsung Supabase jika mau cepat
      for (const item of historyData) {
        await fetch(`${API_URL}/history/${item.id}`, {
          method: "DELETE",
        }).catch(console.error);
      }

      toast.success("Riwayat dihapus.");
      fetchHistory();
      setShowDeleteAllModal(false);
    } catch (error) {
      toast.error("Gagal menghapus.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setActiveField("theme");
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    });
  };

  // --- FETCH HISTORY LANGSUNG DARI SUPABASE (LEBIH CEPAT) ---
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("riwayat_uji")
        .select("*")
        .order("tanggal_sampling", { ascending: false }); // Data terbaru di atas

      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error("Gagal ambil data:", error);
      // Jangan set kosong jika error koneksi sesaat, tapi user minta refresh
      // setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (session) fetchHistory();
  }, [session]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.lokasi_gi || !formData.nama_trafo) {
      toast.error("Lokasi GI dan Nama Trafo wajib diisi!");
      return;
    }
    setLoading(true);
    // Simulasi delay sedikit biar kerasa "mikir"
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Kirim email untuk audit log di backend
          diambil_oleh: session?.user?.email || formData.diambil_oleh,
        }),
      });

      if (!response.ok) throw new Error("Gagal memproses");

      const data = await response.json();
      setResult(data);
      toast.success("Analisis Selesai!");
      fetchHistory(); // Refresh tabel history
    } catch (error) {
      toast.error("Gagal terhubung ke Server AI!");
    }
    setLoading(false);
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setIsSidebarOpen(false);
  };

  // --- RENDER GATES ---
  if (ENABLE_AUTH && authChecking) return <LoadingScreen />;

  if (!session) {
    if (showLogin)
      return (
        <>
          <Toaster />
          <button
            onClick={() => setShowLogin(false)}
            className="fixed top-4 left-4 z-50 text-white bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-black/50 transition"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <LoginPage onLoginSuccess={setSession} />
        </>
      );
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LandingPage
          onStart={() => setShowLogin(true)}
          onGuide={() => setShowLogin(true)}
          isDarkMode={isDarkMode}
        />
      </Suspense>
    );
  }

  // ============================================
  // 🔥 RENDER UTAMA (DASHBOARD)
  // ============================================
  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-500 ${
        isDarkMode
          ? "bg-[#0f172a] text-slate-200"
          : "bg-gray-100 text-slate-800"
      }`}
    >
      <Toaster position="top-center" richColors />
      {loading && <LoadingScreen />}

      {/* --- MODALS --- */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`p-8 rounded-2xl max-w-sm w-full text-center ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <Trash2 className="mx-auto mb-4 text-orange-500" size={40} />
            <h3 className="text-xl font-bold mb-2">Hapus Semua?</h3>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteAll}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`p-8 rounded-2xl max-w-sm w-full text-center ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <LogOut className="mx-auto mb-4 text-red-500" size={40} />
            <h3 className="text-xl font-bold mb-2">Keluar Akun?</h3>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <VoltyAssistant
        activeField={activeField}
        onClose={() => setActiveField(null)}
      />

      {/* HEADER */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 h-16 px-4 flex items-center justify-between shadow-sm transition-colors duration-300 backdrop-blur-md ${
          isDarkMode
            ? "bg-slate-900/80 border-b border-slate-700"
            : "bg-white/80 border-b border-gray-200"
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`p-2 rounded-lg hover:bg-gray-500/10 transition active:scale-95 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            <Menu size={26} />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="text-[#1B7A8F]" size={20} fill="#1B7A8F" />
            <h1 className="text-lg font-bold tracking-tight">
              PLN <span className="text-[#F1C40F]">SMART</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p
              className={`text-xs font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {session.user.email}
            </p>
            <p className="text-[10px] opacity-60 uppercase font-bold text-[#1B7A8F]">
              {userRole === "super_admin" ? "Super Admin" : userUnit || "Admin"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-md">
            {session.user.email.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isDarkMode
            ? "bg-[#1e293b] border-r border-slate-700"
            : "bg-white border-r border-slate-200"
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-500/10">
          <div>
            <h1
              className={`font-bold text-xl leading-none ${
                isDarkMode ? "text-white" : "text-[#1B7A8F]"
              }`}
            >
              PLN <span className="text-[#FFD700]">SMART</span>
            </h1>
            <p className="text-[10px] opacity-60 uppercase tracking-widest mt-1">
              UPT Manado
            </p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <MenuButton
            icon={<LayoutDashboard size={20} />}
            label="Dashboard Aset"
            active={activePage === "dashboard"}
            onClick={() => navigateTo("dashboard")}
            isDarkMode={isDarkMode}
          />
          <MenuButton
            icon={<FileText size={20} />}
            label="Input Uji DGA"
            active={activePage === "input_dga"}
            onClick={() => navigateTo("input_dga")}
            isDarkMode={isDarkMode}
          />
          <MenuButton
            icon={<TrendingUp size={20} />}
            label="Analisis Trending"
            active={activePage === "trending"}
            onClick={() => navigateTo("trending")}
            isDarkMode={isDarkMode}
          />
          <MenuButton
            icon={<History size={20} />}
            label="Riwayat Pengujian"
            active={activePage === "history"}
            onClick={() => navigateTo("history")}
            isDarkMode={isDarkMode}
          />
          <MenuButton
            icon={<BookOpen size={20} />}
            label="Panduan & Standar"
            active={activePage === "guide"}
            onClick={() => navigateTo("guide")}
            isDarkMode={isDarkMode}
          />

          {userRole === "super_admin" && (
            <div className="mt-4 pt-4 border-t border-gray-500/20 animate-in fade-in slide-in-from-left-5">
              <p className="px-4 text-[10px] font-bold uppercase opacity-50 mb-2 tracking-widest">
                Admin Area
              </p>
              <MenuButton
                icon={<ShieldCheck size={20} className="text-purple-500" />}
                label="Kelola Aset Master"
                active={activePage === "super_admin"}
                onClick={() => navigateTo("super_admin")}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-500/10 space-y-3 bg-opacity-50">
          <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 p-3 rounded-xl w-full transition"
          >
            <LogOut size={18} /> Keluar Akun
          </button>
          <div className="text-[10px] text-center opacity-40 pt-2">
            v2.0 • {session.user.email}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="pt-20 px-4 md:px-6 pb-10 max-w-7xl mx-auto w-full">
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            {activePage === "dashboard" && (
              <PageTransition key="dashboard">
                <DashboardPage isDarkMode={isDarkMode} liveData={historyData} />
              </PageTransition>
            )}
            {activePage === "input_dga" && (
              <PageTransition key="input_dga">
                <InputFormPage
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  result={result}
                  isDarkMode={isDarkMode}
                  isLoading={loading}
                />
              </PageTransition>
            )}
            {activePage === "trending" && (
              <PageTransition key="trending">
                <TrendingPage
                  liveData={historyData}
                  isDarkMode={isDarkMode}
                  userRole={userRole}
                  userUnit={userUnit}
                />
              </PageTransition>
            )}
            {activePage === "history" && (
              <PageTransition key="history">
                <HistoryPage
                  historyData={historyData}
                  isDarkMode={isDarkMode}
                  fetchHistory={fetchHistory}
                  loadingHistory={loadingHistory}
                  onDeleteAll={handleDeleteAllHistory}
                  userRole={userRole}
                  userUnit={userUnit}
                />
              </PageTransition>
            )}
            {activePage === "guide" && (
              <PageTransition key="guide">
                <GuidePage isDarkMode={isDarkMode} />
              </PageTransition>
            )}
            {activePage === "super_admin" && userRole === "super_admin" && (
              <PageTransition key="super_admin">
                <SuperAdminPage session={session} />
              </PageTransition>
            )}
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

const MenuButton = ({ icon, label, active, onClick, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${
      active
        ? "bg-[#1B7A8F] text-white shadow-lg shadow-[#1B7A8F]/30 translate-x-1"
        : `hover:bg-gray-500/5 ${
            isDarkMode
              ? "text-gray-300 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`
    }`}
  >
    {icon} {label}
  </button>
);
