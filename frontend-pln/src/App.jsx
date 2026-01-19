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

export default function Home() {
  // --- STATE OTENTIKASI ---
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // State untuk navigasi Public (Landing <-> Login)
  const [showLogin, setShowLogin] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecking(false);
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
    try {
      await supabase.auth.signOut();
      setSession(null);
      setShowLogin(false); // Reset ke landing page setelah logout
      toast.success("Berhasil keluar akun.");
    } catch (error) {
      toast.error("Gagal logout.");
    }
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

  // 1. Loading saat cek sesi
  if (authChecking) {
    return <LoadingScreen />;
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
        <Suspense fallback={<LoadingScreen />}>
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
