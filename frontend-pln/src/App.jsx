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
  ArrowLeft, // Penting untuk tombol kembali dari login
  Trash2,
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

// ============================================
// 🔧 TOGGLE AUTENTIKASI
// ============================================
// Ubah menjadi 'false' untuk disable login (development mode)
// Ubah menjadi 'true' untuk enable login dengan Supabase
const ENABLE_AUTH = false;
// ============================================

export default function Home() {
  // --- STATE OTENTIKASI ---
  // Jika auth disabled, langsung set mock session dan skip checking
  const [session, setSession] = useState(
    !ENABLE_AUTH ? { user: { email: "dev@pln.co.id", id: "dev-mode" }, access_token: "dev-token" } : null
  );
  const [authChecking, setAuthChecking] = useState(ENABLE_AUTH); // Hanya check jika auth enabled

  // State untuk navigasi Public (Landing <-> Login)
  const [showLogin, setShowLogin] = useState(false);
  
  // State untuk konfirmasi logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // State untuk konfirmasi delete all history
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // --- STATE LAMA ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activePage, setActivePage] = useState("dashboard"); // Default dashboard saat login
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [activeField, setActiveField] = useState(null);

  // State Form & Data
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

  // --- EFFECT: CEK STATUS LOGIN SUPABASE ---
  useEffect(() => {
    // Jika autentikasi di-disable, langsung bypass dengan mock session
    if (!ENABLE_AUTH) {
      const mockSession = {
        user: { email: "dev@pln.co.id", id: "dev-mode" },
        access_token: "dev-token"
      };
      setSession(mockSession);
      setAuthChecking(false);
      console.log("🔓 Auth disabled - Running in development mode");
      return () => {};
    }

    // Jika auth enabled, cek apakah Supabase dikonfigurasi dengan benar
    const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
                          import.meta.env.VITE_SUPABASE_KEY &&
                          import.meta.env.VITE_SUPABASE_URL !== "https://placeholder.supabase.co";
    
    if (!hasValidConfig) {
      console.warn("Supabase not configured properly");
      setAuthChecking(false);
      setSession(null);
      return () => {};
    }

    // Jika ada konfigurasi valid, coba auth normal
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecking(false);
    }).catch((error) => {
      console.error("Supabase auth error:", error);
      setAuthChecking(false);
      setSession(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- FUNGSI LOGOUT ---
  const handleLogout = async () => {
    setShowLogoutModal(true); // Tampilkan modal konfirmasi
  };

  const confirmLogout = async () => {
    try {
      // Hapus riwayat chat Volty dari localStorage
      localStorage.removeItem("volty_chat_history");
      
      await supabase.auth.signOut();
      setSession(null);
      setShowLogin(false); // Reset ke landing page setelah logout
      setShowLogoutModal(false);
      toast.success("Berhasil keluar akun.");
    } catch (error) {
      toast.error("Gagal logout.");
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // --- FUNGSI DELETE ALL HISTORY ---
  const handleDeleteAllHistory = async () => {
    setShowDeleteAllModal(true); // Tampilkan modal konfirmasi
  };

  const confirmDeleteAll = async () => {
    try {
      setLoadingHistory(true);
      let count = 0;
      for (const item of historyData) {
        try {
          await fetch(`${API_URL}/history/${item.id}`, {
            method: "DELETE",
            keepalive: true,
          });
          count++;
        } catch (e) {
          console.error(e);
        }
      }
      toast.success(`Berhasil menghapus ${count} data.`);
      fetchHistory();
      setShowDeleteAllModal(false);
    } catch (error) {
      toast.error("Gagal menghapus data.");
    }
  };

  const cancelDeleteAll = () => {
    setShowDeleteAllModal(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setActiveField("theme");
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === "number" ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, [name]: val });
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/history`);
      if (!response.ok) throw new Error("Gagal ambil data");
      const data = await response.json();
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryData([]);
    }
    setLoadingHistory(false);
  };

  // Fetch data hanya jika user sudah login
  useEffect(() => {
    if (session) {
      fetchHistory();
    }
  }, [session]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.lokasi_gi || !formData.nama_trafo) {
      toast.error("Lokasi GI dan Nama Trafo wajib diisi!");
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Gagal memproses data");

      const data = await response.json();
      setResult(data);
      toast.success("Analisis Selesai! Data tersimpan.");
      fetchHistory();

      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error(error);
      toast.error("Gagal terhubung ke Server AI!");
    }
    setLoading(false);
  };

  // ==========================================
  // LOGIKA RENDER (GATEKEEPER)
  // ==========================================

  // 1. Loading saat cek sesi (hanya jika auth enabled)
  if (ENABLE_AUTH && authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-16 h-16 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
          <Zap className="text-[#1B7A8F]" size={32} />
        </div>
      </div>
    );
  }

  // 2. JIKA BELUM LOGIN (PUBLIC AREA)
  if (!session) {
    if (showLogin) {
      // Tampilkan LOGIN PAGE + Tombol Kembali
      return (
        <>
          <Toaster position="top-center" richColors />
          <button
            onClick={() => setShowLogin(false)}
            className="fixed top-4 left-4 z-50 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold bg-black/30 hover:bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm transition-all"
          >
            <ArrowLeft size={16} /> Kembali ke Beranda
          </button>
          <LoginPage onLoginSuccess={(sess) => setSession(sess)} />
        </>
      );
    } else {
      // Tampilkan LANDING PAGE
      return (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
            <div className="w-16 h-16 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
              <Zap className="text-[#1B7A8F]" size={32} />
            </div>
          </div>
        }>
          <LandingPage
            onStart={() => setShowLogin(true)} // Arahkan ke Login
            onGuide={() => setShowLogin(true)}
            isDarkMode={isDarkMode}
          />
        </Suspense>
      );
    }
  }

  // 3. JIKA SUDAH LOGIN (PROTECTED DASHBOARD)
  return (
    <div
      className={`flex min-h-screen font-sans transition-colors duration-500 ${
        isDarkMode
          ? "bg-[#0f172a] text-slate-200"
          : "bg-gray-100 text-slate-800"
      }`}
    >
      <Toaster position="top-center" richColors />
      {loading && <LoadingScreen />}

      {/* Modal Konfirmasi Delete All History */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 ${
            isDarkMode ? "bg-[#1e293b] border border-slate-700" : "bg-white"
          }`}>
            <div className="flex flex-col items-center text-center">
              {/* Icon Warning */}
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-orange-500" size={32} />
              </div>
              
              {/* Title */}
              <h3 className={`text-2xl font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
                Hapus Semua Data?
              </h3>
              
              {/* Description */}
              <p className={`mb-6 ${
                isDarkMode ? "text-slate-400" : "text-gray-600"
              }`}>
                Apakah Anda yakin ingin menghapus <strong>{historyData.length} data</strong> dari riwayat? Tindakan ini tidak dapat dibatalkan.
              </p>
              
              {/* Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelDeleteAll}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isDarkMode 
                      ? "bg-slate-700 hover:bg-slate-600 text-white" 
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteAll}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all"
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 ${
            isDarkMode ? "bg-[#1e293b] border border-slate-700" : "bg-white"
          }`}>
            <div className="flex flex-col items-center text-center">
              {/* Icon Warning */}
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <LogOut className="text-red-500" size={32} />
              </div>
              
              {/* Title */}
              <h3 className={`text-2xl font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
                Keluar Akun?
              </h3>
              
              {/* Description */}
              <p className={`mb-6 ${
                isDarkMode ? "text-slate-400" : "text-gray-600"
              }`}>
                Apakah Anda yakin ingin keluar dari akun ini?
              </p>
              
              {/* Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelLogout}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isDarkMode 
                      ? "bg-slate-700 hover:bg-slate-600 text-white" 
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  Tidak
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-red-500 hover:bg-red-600 text-white transition-all"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <VoltyAssistant
        activeField={activeField}
        onClose={() => setActiveField(null)}
      />

      <aside
        className={`fixed h-full border-r flex flex-col z-20 shadow-2xl transition-colors duration-500 ${
          isDarkMode
            ? "bg-[#1e293b] border-slate-700"
            : "bg-white border-slate-200"
        }`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-6 flex flex-col h-full">
          {/* HEADER SIDEBAR */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200/20">
            <div className="w-10 h-10 bg-[#FFD700] rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="text-[#1B7A8F]" size={24} />
            </div>
            <div>
              <h1
                className={`font-bold text-lg leading-tight ${
                  isDarkMode ? "text-white" : "text-[#1B7A8F]"
                }`}
              >
                PLN <span className="text-[#FFD700]">SMART</span>
              </h1>
              <p className="text-[10px] opacity-70 uppercase tracking-widest">
                UPT Manado
              </p>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => setActivePage("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === "dashboard"
                  ? "bg-[#1B7A8F] text-white shadow-lg"
                  : "hover:bg-gray-100/10"
              }`}
            >
              <LayoutDashboard size={20} /> Dashboard Aset
            </button>
            <button
              onClick={() => setActivePage("input_dga")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === "input_dga"
                  ? "bg-[#1B7A8F] text-white shadow-lg"
                  : "hover:bg-gray-100/10"
              }`}
            >
              <FileText size={20} /> Input Uji DGA
            </button>
            <button
              onClick={() => setActivePage("trending")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === "trending"
                  ? "bg-[#1B7A8F] text-white shadow-lg"
                  : "hover:bg-gray-100/10"
              }`}
            >
              <TrendingUp size={20} /> Analisis Trending
            </button>
            <button
              onClick={() => setActivePage("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === "history"
                  ? "bg-[#1B7A8F] text-white shadow-lg"
                  : "hover:bg-gray-100/10"
              }`}
            >
              <History size={20} /> Riwayat
            </button>
            <button
              onClick={() => setActivePage("guide")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === "guide"
                  ? "bg-[#1B7A8F] text-white shadow-lg"
                  : "hover:bg-gray-100/10"
              }`}
            >
              <BookOpen size={20} /> Panduan
            </button>
          </nav>

          {/* FOOTER SIDEBAR (THEME & LOGOUT) */}
          <div className="mt-auto pt-6 border-t border-gray-200/20 space-y-3">
            <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            {/* TOMBOL LOGOUT */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-bold text-red-500 opacity-80 hover:opacity-100 transition-opacity w-full hover:bg-red-500/10 p-2 rounded-lg"
            >
              <LogOut size={14} /> Keluar Akun
            </button>

            {/* Info User */}
            <div className="text-[10px] text-center opacity-40">
              Login sebagai: {session.user.email}
            </div>
          </div>
        </div>
      </aside>

      <main
        className="flex-1 p-4 lg:p-8 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-16 h-16 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
              <Zap className="text-[#1B7A8F]" size={32} />
            </div>
          </div>
        }>
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
                <TrendingPage isDarkMode={isDarkMode} liveData={historyData} />
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
                />
              </PageTransition>
            )}

            {activePage === "guide" && (
              <PageTransition key="guide">
                <GuidePage isDarkMode={isDarkMode} />
              </PageTransition>
            )}
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}
