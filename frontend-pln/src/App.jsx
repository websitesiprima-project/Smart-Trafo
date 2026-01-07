import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  History,
  BookOpen,
  Zap,
  ArrowLeft,
  FileText, // Icon untuk menu Input
  TrendingUp, // Icon untuk menu Trending
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";

import PageTransition from "./components/PageTransition";
import LoadingScreen from "./components/LoadingScreen";
import VoltyAssistant from "./components/VoltyAssistant";
import ThemeToggle from "./components/ThemeToggle";

// --- IMPORT HALAMAN ---
import DashboardPage from "./components/DashboardPage"; // Dashboard (Peta)
import InputFormPage from "./components/InputFormPage"; // Form Input DGA
import TrendingPage from "./components/TrendingPage"; // Halaman Grafik (Baru)
import HistoryPage from "./components/HistoryPage";
import GuidePage from "./components/GuidePage";
import LandingPage from "./components/LandingPage";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activePage, setActivePage] = useState("landing");
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [activeField, setActiveField] = useState(null);

  // --- STATE FORMULIR UTAMA ---
  const [formData, setFormData] = useState({
    // Header Data (Akan di-autofill)
    no_dokumen: "-",
    merk_trafo: "",
    serial_number: "",
    level_tegangan: "",
    mva: "",
    tahun_pembuatan: "",
    lokasi_gi: "",
    nama_trafo: "",
    jenis_minyak: "",

    // Sampling Data
    tanggal_sampling: new Date().toISOString().split("T")[0],
    suhu_sampel: 0,
    diambil_oleh: "",

    // Gas Data
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

  // --- STATE HISTORY ---
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setActiveField("theme");
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === "number" ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, [name]: val });
  };

  // --- FUNGSI API (SUBMIT FORM) ---
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.lokasi_gi || !formData.nama_trafo) {
      toast.error("Lokasi GI dan Nama Trafo wajib diisi!");
      return;
    }

    setLoading(true);
    // Simulasi Delay agar loading terlihat
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // GANTI URL INI SESUAI BACKEND ANDA
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Gagal memproses data");
      }

      const data = await response.json();
      setResult(data);
      toast.success("Analisis Selesai! Cek hasil di bawah.");

      // Auto Scroll ke hasil
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error(error);
      toast.error("Gagal terhubung ke Server AI!");
      // Fallback Dummy Data jika Backend mati (Bisa dihapus nanti)
      setResult({
        ieee_status: "Normal",
        rogers_diagnosis: "No Fault",
        key_gas: "H2",
        tdcg_value: formData.h2 + formData.ch4 + formData.co,
        volty_chat: "Sistem offline. Ini adalah hasil simulasi sementara.",
      });
    }
    setLoading(false);
  };

  // --- FUNGSI API (HISTORY) ---
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/history");
      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      toast.error("Gagal mengambil data riwayat");
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (activePage === "history") fetchHistory();
  }, [activePage]);

  // --- RENDER LANDING PAGE ---
  if (activePage === "landing") {
    return (
      <LandingPage
        onStart={() => setActivePage("dashboard")}
        onGuide={() => setActivePage("guide")}
        isDarkMode={isDarkMode}
      />
    );
  }

  // --- RENDER MAIN APP ---
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

      {/* --- SIDEBAR NAVIGATION --- */}
      <aside
        className={`fixed h-full border-r flex flex-col z-20 shadow-2xl transition-colors duration-500 ${
          isDarkMode
            ? "bg-[#1e293b] border-slate-700"
            : "bg-white border-slate-200"
        }`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Logo Area */}
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

          {/* Menu Items */}
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

          {/* Footer Actions */}
          <div className="mt-auto pt-6 border-t border-gray-200/20 space-y-3">
            <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
            <button
              onClick={() => setActivePage("landing")}
              className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft size={14} /> Keluar Aplikasi
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main
        className="flex-1 p-4 lg:p-8 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AnimatePresence mode="wait">
          {/* HALAMAN 1: DASHBOARD */}
          {activePage === "dashboard" && (
            <PageTransition key="dashboard">
              <DashboardPage isDarkMode={isDarkMode} />
            </PageTransition>
          )}

          {/* HALAMAN 2: INPUT FORM (PENTING: ada setFormData) */}
          {activePage === "input_dga" && (
            <PageTransition key="input_dga">
              <InputFormPage
                formData={formData}
                setFormData={setFormData} // <--- INI KUNCI AGAR AUTOFILL JALAN
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                result={result}
                isDarkMode={isDarkMode}
                isLoading={loading}
              />
            </PageTransition>
          )}

          {/* HALAMAN 3: TRENDING (BARU) */}
          {activePage === "trending" && (
            <PageTransition key="trending">
              <TrendingPage isDarkMode={isDarkMode} />
            </PageTransition>
          )}

          {/* HALAMAN 4: RIWAYAT */}
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

          {/* HALAMAN 5: PANDUAN */}
          {activePage === "guide" && (
            <PageTransition key="guide">
              <GuidePage isDarkMode={isDarkMode} />
            </PageTransition>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
