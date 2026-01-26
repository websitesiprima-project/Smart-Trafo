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
import { supabase } from "./lib/supabaseClient";
import LoginPage from "./components/LoginPage";
import PageTransition from "./components/PageTransition";
import LoadingScreen from "./components/LoadingScreen";
import VoltyAssistant from "./components/VoltyAssistant";
import ThemeToggle from "./components/ThemeToggle";

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
  const [authChecking, setAuthChecking] = useState(true);

  // State User
  const [userRole, setUserRole] = useState(null);
  const [userUnit, setUserUnit] = useState(null);

  // State UI
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [activeField, setActiveField] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data State
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
  // 🔥 AUTH LOGIC
  // ===============================================
  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted && authChecking) {
        console.warn("⚠️ Auth timeout. Memaksa masuk aplikasi.");
        setAuthChecking(false);
      }
    }, 3000);

    const fetchProfile = async (user) => {
      try {
        if (user.email === "superadminupt@gmail.com") {
          setUserRole("super_admin");
          setUserUnit(null);
          console.log("🚀 Force Login: SUPER ADMIN");
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("role, unit_ultg")
          .eq("id", user.id)
          .single();

        if (mounted && data) {
          setUserRole(data.role);
          setUserUnit(data.unit_ultg);
        }
      } catch (e) {
        console.warn("Profile fetch error", e);
      }
    };

    const initAuth = async () => {
      try {
        if (!ENABLE_AUTH) {
          setSession({ user: { email: "dev@pln.co.id" } });
          setUserRole("super_admin");
          if (mounted) setAuthChecking(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (session) {
            setSession(session);
            await fetchProfile(session.user);
          }
          setAuthChecking(false);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (mounted) setAuthChecking(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) await fetchProfile(session.user);
        else {
          setUserRole(null);
          setUserUnit(null);
        }
        setAuthChecking(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // --- ACTIONS ---
  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      if (ENABLE_AUTH) await supabase.auth.signOut();
    } catch (e) {
      console.warn(e);
    } finally {
      localStorage.clear();
      setSession(null);
      setUserRole(null);
      setUserUnit(null);
      setShowLogin(false);
      toast.success("Berhasil keluar.");
      window.location.reload();
    }
  };

  const handleDeleteAllHistory = () => setShowDeleteAllModal(true);

  const confirmDeleteAll = async () => {
    setLoadingHistory(true);
    try {
      if (userRole !== "super_admin") {
        toast.error("Hanya Super Admin yang bisa menghapus semua data.");
        return;
      }
      for (const item of historyData) {
        await supabase.from("riwayat_uji").delete().eq("id", item.id);
      }
      toast.success("Data berhasil direset.");
      fetchHistory();
    } catch (e) {
      toast.error("Gagal menghapus data.");
    } finally {
      setLoadingHistory(false);
      setShowDeleteAllModal(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("riwayat_uji")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (session) fetchHistory();
  }, [session]);

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.lokasi_gi || !formData.nama_trafo)
      return toast.error("Lokasi & Trafo wajib diisi!");

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          diambil_oleh: session?.user?.email,
        }),
      });
      const data = await res.json();
      setResult(data);
      toast.success("Analisis Selesai!");
      fetchHistory();
    } catch {
      toast.error("Gagal koneksi ke AI Server!");
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setIsSidebarOpen(false);
  };

  // --- RENDER ---
  if (ENABLE_AUTH && authChecking) return <LoadingScreen />;

  if (!session) {
    if (showLogin)
      return (
        <>
          <Toaster />
          <button
            onClick={() => setShowLogin(false)}
            className="fixed top-4 left-4 z-50 text-white bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm"
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

      {/* Modal Delete */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`p-8 rounded-2xl max-w-sm w-full text-center ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <Trash2 className="mx-auto mb-4 text-orange-500" size={40} />
            <h3 className="text-xl font-bold mb-6">Hapus Semua Data?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteAll}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`p-8 rounded-2xl max-w-sm w-full text-center ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <LogOut className="mx-auto mb-4 text-red-500" size={40} />
            <h3 className="text-xl font-bold mb-6">Keluar Akun?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg"
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

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 h-16 px-4 flex items-center justify-between shadow-sm backdrop-blur-md ${
          isDarkMode
            ? "bg-slate-900/80 border-b border-slate-700"
            : "bg-white/80 border-b border-gray-200"
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-500/10"
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
        <div className="flex items-center gap-3 text-right">
          <div className="hidden md:block">
            <p
              className={`text-xs font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {session.user.email}
            </p>
            <p className="text-[10px] font-bold text-[#1B7A8F] uppercase tracking-wider">
              {userRole === "super_admin" ? "SUPER ADMIN" : userUnit || "ADMIN"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {session.user.email.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${
          isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl transition-transform duration-300 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isDarkMode ? "bg-[#1e293b]" : "bg-white"}`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-500/10">
          <h1
            className={`font-bold text-xl ${
              isDarkMode ? "text-white" : "text-[#1B7A8F]"
            }`}
          >
            PLN <span className="text-[#F1C40F]">SMART</span>
          </h1>
          <button onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <MenuButton
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activePage === "dashboard"}
            onClick={() => navigateTo("dashboard")}
            isDarkMode={isDarkMode}
          />
          <MenuButton
            icon={<FileText size={20} />}
            label="Input DGA"
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
            label="Riwayat"
            active={activePage === "history"}
            onClick={() => navigateTo("history")}
            isDarkMode={isDarkMode}
          />
          <MenuButton
            icon={<BookOpen size={20} />}
            label="Panduan"
            active={activePage === "guide"}
            onClick={() => navigateTo("guide")}
            isDarkMode={isDarkMode}
          />

          {userRole === "super_admin" && (
            <div className="mt-4 pt-4 border-t border-gray-500/20">
              <p className="px-4 text-[10px] font-bold uppercase opacity-50 mb-2 tracking-widest">
                Admin Area
              </p>
              <MenuButton
                icon={<ShieldCheck size={20} className="text-purple-500" />}
                label="Kelola Aset"
                active={activePage === "super_admin"}
                onClick={() => navigateTo("super_admin")}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-500/10 space-y-3">
          <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 p-3 rounded-xl w-full transition"
          >
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      {/* 🔥 INI KUNCI FULL SCREEN: HAPUS max-w-7xl dan mx-auto */}
      <main
        className={`
            pt-20 pb-10 w-full min-h-screen transition-all duration-300
            ${activePage === "super_admin" ? "px-0" : "px-4 md:px-6"} 
        `}
      >
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            {activePage === "dashboard" && (
              <PageTransition key="dash">
                <DashboardPage isDarkMode={isDarkMode} liveData={historyData} />
              </PageTransition>
            )}
            {activePage === "input_dga" && (
              <PageTransition key="input">
                <InputFormPage
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  result={result}
                  isDarkMode={isDarkMode}
                  isLoading={loading}
                  userRole={userRole}
                  userUnit={userUnit}
                />
              </PageTransition>
            )}
            {activePage === "trending" && (
              <PageTransition key="trend">
                <TrendingPage
                  liveData={historyData}
                  isDarkMode={isDarkMode}
                  userRole={userRole}
                  userUnit={userUnit}
                />
              </PageTransition>
            )}
            {activePage === "history" && (
              <PageTransition key="hist">
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
              <PageTransition key="admin">
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
        ? "bg-[#1B7A8F] text-white shadow-lg translate-x-1"
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
