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
  Users,
  Map as MapIcon,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { supabase } from "./lib/supabaseClient";

// Components Kecil (Keep Direct Import)
import PageTransition from "./components/PageTransition";
import LoadingScreen from "./components/LoadingScreen";
import VoltyAssistant from "./components/VoltyAssistant";
import VoltyMascot from "./components/VoltyMascot";
import ThemeToggle from "./components/ThemeToggle";
import useAutoLogout from "./hooks/useAutoLogout";

// 🔥 OPTIMASI JS: SEMUA HALAMAN UTAMA DI-LAZY LOAD
// Browser tidak akan download codingan halaman ini sampai user membukanya.
const LoginPage = lazy(() => import("./components/LoginPage")); // Sekarang Lazy!
const LandingPage = lazy(() => import("./components/LandingPage"));
const DashboardPage = lazy(() => import("./components/DashboardPage"));
const InputFormPage = lazy(() => import("./components/InputFormPage"));
const TrendingPage = lazy(() => import("./components/TrendingPage"));
const HistoryPage = lazy(() => import("./components/HistoryPage"));
const GuidePage = lazy(() => import("./components/GuidePage"));
const SuperAdminPage = lazy(() => import("./components/SuperAdminPage"));
const UserManagementPage = lazy(
  () => import("./components/UserManagementPage"),
);
const UnitManagementPage = lazy(
  () => import("./components/UnitManagementPage"),
);

const API_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userUnit, setUserUnit] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // State Mapping Dinamis
  const [unitGiMapping, setUnitGiMapping] = useState({});

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("pln-smart-trafo-darkmode");
    return saved ? JSON.parse(saved) : false;
  });
  const [activePage, setActivePage] = useState(() => {
    const saved = localStorage.getItem("pln-smart-trafo-activepage");
    return saved || "dashboard";
  });
  const [activeField, setActiveField] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [guideTab, setGuideTab] = useState("ieee");

  useEffect(() => {
    localStorage.setItem("pln-smart-trafo-activepage", activePage);
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem(
      "pln-smart-trafo-darkmode",
      JSON.stringify(isDarkMode),
    );
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

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

  // --- FETCH MAPPING DINAMIS ---
  useEffect(() => {
    const loadMapping = async () => {
      try {
        const res = await fetch(`${API_URL}/master/hierarchy`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Object.keys(data).length > 0) setUnitGiMapping(data);
      } catch (e) {
        console.warn("Backend offline/error:", e);
      }
    };
    loadMapping();
  }, []);

  // --- AUTH LOGIC ---
  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role, unit_ultg")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setUserRole(data.role);
        setUserUnit(data.unit_ultg);
      } else {
        setUserRole("viewer");
        setUserUnit(null);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setUserRole("viewer");
    }
  };

  useEffect(() => {
    let mounted = true;
    const handleSession = async (currentSession) => {
      try {
        if (currentSession) {
          setSession(currentSession);
          await fetchUserProfile(currentSession.user.id);
        } else {
          setSession(null);
          setUserRole(null);
          setUserUnit(null);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      } finally {
        if (mounted) setAuthChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    const safetyTimer = setTimeout(() => {
      if (authChecking && mounted) {
        setAuthChecking(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // --- FETCH HISTORY ---
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      let query = supabase
        .from("riwayat_uji")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      const { data, error } = await query;
      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (session?.user) fetchHistory();
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel("public:riwayat_uji")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "riwayat_uji" },
        () => fetchHistory(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("pln-smart-trafo-auth");
    } catch (e) {
      console.error("Logout err", e);
    }
    setSession(null);
    setUserRole(null);
    setUserUnit(null);
    setShowLogin(false);
    setActivePage("dashboard");
    setIsLoggingOut(false);
    toast.success("Berhasil keluar.");
  };

  useAutoLogout(() => {
    if (session) {
      toast.warning("Sesi berakhir karena tidak ada aktivitas.");
      handleLogout();
    }
  }, 900000);

  const handleDeleteAllHistory = () => setShowDeleteAllModal(true);
  const confirmDeleteAll = async () => {
    setLoadingHistory(true);
    try {
      if (userRole !== "super_admin") return toast.error("Akses ditolak.");
      for (const item of historyData)
        await supabase.from("riwayat_uji").delete().eq("id", item.id);
      toast.success("Data direset.");
    } catch {
      toast.error("Gagal hapus.");
    } finally {
      setLoadingHistory(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    });
  };

  const findUnitByGI = (giName) => {
    const search = (giName || "").toUpperCase();
    for (const [unit, list] of Object.entries(unitGiMapping)) {
      if (Array.isArray(list)) {
        if (
          list.some((g) => {
            const gName = (typeof g === "string" ? g : g.name).toUpperCase();
            return search.includes(gName.replace("GI ", ""));
          })
        )
          return unit;
      }
    }
    return userUnit || "Lainnya";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!formData.lokasi_gi || !formData.nama_trafo)
      return toast.error("Harap isi Lokasi GI & Nama Trafo!");

    if (userRole !== "super_admin" && userUnit) {
      const allowedGIs = unitGiMapping[userUnit] || [];
      const inputGI = (formData.lokasi_gi || "").trim().toLowerCase();
      const isAllowed = allowedGIs.some((gi) => {
        const giName = (typeof gi === "string" ? gi : gi.name).toLowerCase();
        return inputGI.includes(giName) || giName.includes(inputGI);
      });
      if (!isAllowed && Object.keys(unitGiMapping).length > 0) {
        return toast.error(
          `⛔ Akses Ditolak: GI "${formData.lokasi_gi}" bukan bagian dari ULTG ${userUnit}.`,
        );
      }
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal terhubung ke AI Service");
      const resultData = await res.json();
      setResult(resultData);

      const { jenis_minyak, key_gas, ...cleanFormData } = formData;
      let finalOwner = userUnit ? userUnit : findUnitByGI(formData.lokasi_gi);

      const dataToSave = {
        ...cleanFormData,
        tdcg: resultData.tdcg_value || 0,
        status_ieee: resultData.ieee_status || "Normal",
        diagnosa: resultData.rogers_diagnosis || "-",
        hasil_ai: resultData.volty_chat || resultData.hasil_ai || "-",
        diambil_oleh: formData.diambil_oleh,
        email_user: session?.user?.email,
        ultg_pemilik: finalOwner,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("riwayat_uji").insert([dataToSave]);
      if (error) throw error;
      toast.success(`Data berhasil disimpan untuk ${finalOwner}`);
      await fetchHistory();
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (page, options = {}) => {
    setActivePage(page);
    setIsSidebarOpen(false);
    if (options.guideTab) setGuideTab(options.guideTab);
  };

  if (authChecking) return <LoadingScreen />;

  if (isLoggingOut) {
    return (
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-500 ${isDarkMode ? "bg-[#0f172a]" : "bg-white"}`}
      >
        <div className="text-center animate-bounce mb-6">
          <div className="w-40 h-40 mx-auto">
            <VoltyMascot />
          </div>
        </div>
        <h2
          className={`text-3xl font-bold animate-pulse ${isDarkMode ? "text-white" : "text-[#1B7A8F]"}`}
        >
          Sampai Jumpa!
        </h2>
        <p
          className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
        >
          Hati-hati di jalan, {session?.user?.email?.split("@")[0]}...
        </p>
      </div>
    );
  }

  if (!session) {
    return showLogin ? (
      <Suspense fallback={<LoadingScreen />}>
        <Toaster />
        <button
          onClick={() => setShowLogin(false)}
          className="fixed top-4 left-4 z-50 text-white bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        {/* LOGIN PAGE JUGA DI-SUSPENSE AGAR AMAN */}
        <LoginPage onLoginSuccess={() => setShowLogin(false)} />
      </Suspense>
    ) : (
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
      className={`min-h-screen font-sans transition-colors duration-500 ${isDarkMode ? "bg-[#0f172a] text-slate-200" : "bg-slate-100 text-slate-800"}`}
    >
      <Toaster position="top-center" richColors />
      {loading && <LoadingScreen />}

      {/* MODALS */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`p-8 rounded-2xl max-w-sm w-full text-center ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
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
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`p-8 rounded-2xl max-w-sm w-full text-center ${isDarkMode ? "bg-slate-800" : "bg-white"}`}
          >
            <Trash2 className="mx-auto mb-4 text-orange-500" size={40} />
            <h3 className="text-xl font-bold mb-6">Reset Data?</h3>
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

      <VoltyAssistant
        activeField={activeField}
        onClose={() => setActiveField(null)}
      />

      {/* HEADER & SIDEBAR */}
      <header
        className={`fixed top-0 z-30 w-full h-16 px-4 flex items-center justify-between shadow-sm backdrop-blur-md ${isDarkMode ? "bg-slate-900/80" : "bg-white/80"}`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-500/10 rounded-lg"
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
        <div className="hidden md:block text-right">
          <p
            className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            {session.user.email}
          </p>
          <p className="text-[10px] font-bold text-[#1B7A8F] uppercase tracking-wider">
            {userRole === "super_admin" ? "SUPER ADMIN" : userUnit}
          </p>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isDarkMode ? "bg-[#1e293b]" : "bg-white"}`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-500/10">
          <h1
            className={`font-bold text-xl ${isDarkMode ? "text-white" : "text-[#1B7A8F]"}`}
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
            <div className="pt-4 mt-4 border-t border-gray-500/20">
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
              <MenuButton
                icon={<Users size={20} className="text-blue-500" />}
                label="Manajemen User"
                active={activePage === "user_management"}
                onClick={() => navigateTo("user_management")}
                isDarkMode={isDarkMode}
              />
              <MenuButton
                icon={<MapIcon size={20} className="text-green-500" />}
                label="Manajemen Unit"
                active={activePage === "unit_management"}
                onClick={() => navigateTo("unit_management")}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-gray-500/10 space-y-3">
          <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 p-3 rounded-xl w-full transition"
          >
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        className={`pt-20 pb-10 w-full min-h-screen transition-all duration-300 ${activePage === "super_admin" ? "px-0" : "px-4 md:px-6"}`}
      >
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            {activePage === "dashboard" && (
              <PageTransition key="dash">
                <DashboardPage
                  isDarkMode={isDarkMode}
                  liveData={historyData}
                  userRole={userRole}
                  userUnit={userUnit}
                  unitMapping={unitGiMapping}
                />
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
                  unitMapping={unitGiMapping}
                />
              </PageTransition>
            )}
            {activePage === "trending" && (
              <PageTransition key="trend">
                <TrendingPage
                  isDarkMode={isDarkMode}
                  liveData={historyData}
                  userRole={userRole}
                  userUnit={userUnit}
                  unitMapping={unitGiMapping}
                />
              </PageTransition>
            )}
            {activePage === "history" && (
              <PageTransition key="hist">
                {/* 🔥 PERBAIKAN: Menambahkan unitMapping agar HistoryPage sinkron */}
                <HistoryPage
                  historyData={historyData}
                  isDarkMode={isDarkMode}
                  fetchHistory={fetchHistory}
                  loadingHistory={loadingHistory}
                  onDeleteAll={handleDeleteAllHistory}
                  userRole={userRole}
                  userUnit={userUnit}
                  onNavigateToGuide={(tab) =>
                    navigateTo("guide", { guideTab: tab })
                  }
                  unitMapping={unitGiMapping}
                />
              </PageTransition>
            )}
            {activePage === "guide" && (
              <PageTransition key="guide">
                <GuidePage isDarkMode={isDarkMode} initialTab={guideTab} />
              </PageTransition>
            )}
            {activePage === "super_admin" && userRole === "super_admin" && (
              <PageTransition key="admin">
                <SuperAdminPage session={session} isDarkMode={isDarkMode} />
              </PageTransition>
            )}
            {activePage === "user_management" && userRole === "super_admin" && (
              <PageTransition key="users">
                <UserManagementPage session={session} isDarkMode={isDarkMode} />
              </PageTransition>
            )}
            {activePage === "unit_management" && userRole === "super_admin" && (
              <PageTransition key="units">
                <UnitManagementPage
                  session={session}
                  isDarkMode={isDarkMode}
                  onUpdateMapping={setUnitGiMapping}
                />
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
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${active ? "bg-[#1B7A8F] text-white shadow-lg translate-x-1" : `hover:bg-gray-500/5 ${isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}`}
  >
    {icon} {label}
  </button>
);
