import React from "react";
import { Zap, Database, ShieldCheck, Map as MapIcon } from "lucide-react";

// --- KONFIGURASI GAMBAR ---
// Menggunakan nama file sesuai laporan Lighthouse Anda
const HERO_IMAGE_SOURCE = "/assets/Trafo_1.webp";
const LAB_IMAGE_SOURCE = "/assets/Lab.webp";
const LOGO_SMART = "/assets/Logo_SMART.jpg";

// --- LOGO TECH STACK ---
const LOGO_REACT = "/assets/React.webp";
const LOGO_VITE = "/assets/Logo_Vite.webp";
const LOGO_TAILWIND = "/assets/Tailwind_CSS.png";
const LOGO_POSTGRES = "/assets/Postgresql.png";
const LOGO_RECHARTS = "/assets/Rechart.png";
const LOGO_LEAFLET = "/assets/leaflet.png";
const LOGO_SUPABASE = "/assets/supabase.png";

const LandingPage = ({ onStart, onGuide, isDarkMode }) => {
  const primaryColor = "text-[#1B7A8F]";
  const bgPrimary = "bg-[#1B7A8F]";
  const btnGreen = "bg-[#1B7A8F] hover:bg-[#16697a]";

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-500 ${isDarkMode ? "bg-[#0f172a] text-white" : "bg-white text-slate-800"}`}
    >
      {/* NAVBAR */}
      <nav className="container mx-auto px-6 py-5 flex justify-between items-center relative z-20 sticky top-0 bg-opacity-90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
            alt="Logo PLN"
            className="w-20 h-10 object-contain"
            width="32"
            height="40"
          />
          <div className="h-8 w-px bg-gray-300 mx-1 opacity-50"></div>
          <div className="flex items-center gap-2">
            <img
              src={LOGO_SMART}
              alt="Logo SMART"
              className="w-10 h-10 object-contain rounded-md mix-blend-multiply"
              width="40"
              height="40"
            />
            <h1
              className={`text-xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-[#1B7A8F]"}`}
            >
              PLN <span className="text-[#F1C40F]">SMART</span>
            </h1>
          </div>
        </div>

        <div className="hidden md:flex gap-8 text-sm font-medium opacity-80">
          <a href="#" className="hover:text-[#1B7A8F] transition">
            Beranda
          </a>
          <a href="#features" className="hover:text-[#1B7A8F] transition">
            Fitur
          </a>
          <a href="#tech" className="hover:text-[#1B7A8F] transition">
            Teknologi
          </a>
          <a href="#about" className="hover:text-[#1B7A8F] transition">
            Tentang Kami
          </a>
        </div>

        <button
          onClick={onStart}
          aria-label="Login ke Dashboard"
          className={`px-6 py-2.5 rounded shadow-lg hover:-translate-y-0.5 transition-all text-white font-bold text-sm ${btnGreen}`} 
        >
          Login Sekarang
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main>
        {/* HERO SECTION */}
        <section className="container mx-auto px-6 py-12 md:py-20 flex flex-col-reverse md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6 animate-in slide-in-from-left-10 duration-700">
            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
              Transformasi Digital <br />
              <span className={`${primaryColor}`}>
                Monitoring Aset Transmisi
              </span>
            </h2>
            <p
              className={`text-base md:text-lg leading-relaxed max-w-lg ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
            >
              Platform monitoring kesehatan transformator berbasis{" "}
              <strong>Artificial Intelligence</strong> dan Standar{" "}
              <strong>IEEE C57.104</strong> untuk analisis DGA yang akurat,
              cepat, dan <em>real-time</em>.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={onStart}
                className={`px-8 py-3.5 rounded text-white font-bold shadow-xl transition-transform active:scale-95 ${bgPrimary} hover:bg-[#156b7d]`}
              >
                Mulai Analisis
              </button>
            </div>
          </div>

          {/* Hero Image - LCP Optimized */}
          <div className="flex-1 w-full relative animate-in slide-in-from-right-10 duration-700 h-[400px] md:h-[500px] overflow-hidden rounded-2xl shadow-xl">
            <img
              src={HERO_IMAGE_SOURCE}
              alt="Ilustrasi Petugas PLN & Digital Dashboard"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              style={{ objectPosition: "center" }}
              // ✅ PERBAIKAN: Menggunakan 'fetchpriority' (huruf kecil)
              fetchpriority="high"
              width="600"
              height="500"
            />
          </div>
        </section>

        {/* TECH STACK (Lazy Loaded) */}
        <section
          id="tech"
          className={`py-16 ${isDarkMode ? "bg-slate-900" : "bg-slate-50"}`}
        >
          <div className="container mx-auto px-6 text-center space-y-10">
            <div>
              <h3 className="text-2xl font-bold">
                Powered by Modern Technology
              </h3>
              <p
                className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                Dibangun dengan ekosistem teknologi terkini untuk performa
                tinggi & skalabilitas.
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-80 hover:opacity-100 transition-all duration-500">
              {/* React */}
              <div className="flex flex-col items-center gap-3 w-20 group">
                <div className="h-14 w-14 flex items-center justify-center bg-white rounded-xl shadow-sm p-3 group-hover:-translate-y-1 transition-transform">
                  <img
                    src={LOGO_REACT}
                    alt="React Logo"
                    className="h-full w-full object-contain animate-spin-slow"
                    width="56"
                    height="56"
                    loading="lazy"
                  />
                </div>
                <span className="font-bold text-xs text-slate-500">React</span>
              </div>

              {/* Vite */}
              <div className="flex flex-col items-center gap-3 w-20 group">
                <div className="h-14 w-14 flex items-center justify-center bg-white rounded-xl shadow-sm p-2 group-hover:-translate-y-1 transition-transform">
                  <img
                    src={LOGO_VITE}
                    alt="Vite Logo"
                    className="h-full w-full object-contain"
                    width="56"
                    height="56"
                    loading="lazy"
                  />
                </div>
                <span className="font-bold text-xs text-slate-500">Vite</span>
              </div>

              {/* Tailwind */}
              <div className="flex flex-col items-center gap-3 w-32 group">
                <div className="h-14 w-auto px-4 flex items-center justify-center bg-white rounded-xl shadow-sm group-hover:-translate-y-1 transition-transform">
                  <img
                    src={LOGO_TAILWIND}
                    alt="Tailwind CSS Logo"
                    className="h-6 w-full object-contain"
                    width="100"
                    height="24"
                    loading="lazy"
                  />
                </div>
                <span className="font-bold text-xs text-slate-500">
                  Tailwind CSS
                </span>
              </div>

              {/* Supabase */}
              <div className="flex flex-col items-center gap-3 w-20 group">
                <div className="h-14 w-14 flex items-center justify-center bg-white rounded-xl shadow-sm p-2 group-hover:-translate-y-1 transition-transform">
                  <Database size={32} className="text-emerald-500" />
                </div>
                <span className="font-bold text-xs text-slate-500">
                  Supabase
                </span>
              </div>

              {/* PostgreSQL */}
              <div className="flex flex-col items-center gap-3 w-20 group">
                <div className="h-14 w-14 flex items-center justify-center bg-white rounded-xl shadow-sm p-2 group-hover:-translate-y-1 transition-transform">
                  <img
                    src={LOGO_POSTGRES}
                    alt="PostgreSQL Logo"
                    className="h-full w-full object-contain"
                    width="56"
                    height="56"
                    loading="lazy"
                  />
                </div>
                <span className="font-bold text-xs text-slate-500">
                  PostgreSQL
                </span>
              </div>

              {/* Leaflet */}
              <div className="flex flex-col items-center gap-3 w-20 group">
                <div className="h-14 w-14 flex items-center justify-center bg-white rounded-xl shadow-sm p-2 group-hover:-translate-y-1 transition-transform">
                  <img
                    src={LOGO_LEAFLET}
                    alt="Leaflet JS Logo"
                    className="h-full w-full object-contain"
                    width="56"
                    height="56"
                    loading="lazy"
                  />
                </div>
                <span className="font-bold text-xs text-slate-500">
                  Leaflet Map
                </span>
              </div>

              {/* Recharts */}
              <div className="flex flex-col items-center gap-3 w-32 group">
                <div className="h-14 w-auto px-4 flex items-center justify-center bg-white rounded-xl shadow-sm group-hover:-translate-y-1 transition-transform">
                  <img
                    src={LOGO_RECHARTS}
                    alt="Recharts Logo"
                    className="h-8 w-full object-contain grayscale hover:grayscale-0 transition"
                    width="100"
                    height="32"
                    loading="lazy"
                  />
                </div>
                <span className="font-bold text-xs text-slate-500">
                  Recharts
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SENTRALISASI DATA */}
        <section
          id="features"
          className="container mx-auto px-6 py-24 text-center space-y-16"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Sentralisasi Data & <br />
              <span className={primaryColor}>Manajemen Aset</span>
            </h2>
            <p
              className={`${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
            >
              Kelola seluruh aset transmisi dalam satu sistem terintegrasi.
              Tidak perlu lagi file manual yang terpisah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              className={`p-8 rounded-2xl shadow-lg border hover:-translate-y-2 transition-transform duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                <MapIcon size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Unit Management</h3>
              <p
                className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                Kelola data dari berbagai ULTG (Lopana, Sawangan, Kotamobagu,
                Gorontalo) tanpa batasan wilayah.
              </p>
            </div>
            <div
              className={`p-8 rounded-2xl shadow-lg border hover:-translate-y-2 transition-transform duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Role-Based Access</h3>
              <p
                className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                Keamanan data terjamin dengan pembagian hak akses spesifik
                (Super Admin, Manager Unit, & Viewer).
              </p>
            </div>
            <div
              className={`p-8 rounded-2xl shadow-lg border hover:-translate-y-2 transition-transform duration-300 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                <Zap size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Seamless Integration</h3>
              <p
                className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                Database yang siap diintegrasikan dengan sistem korporat atau
                sensor IoT di masa depan.
              </p>
            </div>
          </div>
        </section>

        {/* TRANSFORMASI DGA */}
        <section
          id="about"
          className="container mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 items-center gap-12"
        >
          <div className="order-2 md:order-1 relative flex justify-center h-[350px] md:h-[450px] w-full overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={LAB_IMAGE_SOURCE}
              alt="Proses Uji Laboratorium dan Digitalisasi"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              style={{ objectPosition: "center" }}
              width="600"
              height="450"
              loading="lazy"
            />
          </div>

          <div className="order-1 md:order-2 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Transformasi Pengujian DGA <br />
              <span className="text-green-600">Dari Lab ke Digital</span>
            </h2>
            <p
              className={`text-lg leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
            >
              Mengonversi data hasil uji laboratorium menjadi wawasan{" "}
              <em>real-time</em> untuk pemeliharaan aset yang lebih proaktif.
              Kami memadukan ketelitian prosedur uji manual dengan kecepatan
              analisis digital.
            </p>

            <button
            onClick={onStart}
              className={`px-8 py-3 rounded text-white font-bold shadow-lg transition-transform hover:-translate-y-1 ${btnGreen}`}
            >
              Pelajari Selengkapnya
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        className={`py-12 border-t ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-[#263238] text-white border-slate-800"}`}
      >
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-[#F1C40F]" fill="currentColor" />
              <h2 className="text-2xl font-bold text-white">PLN SMART</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-xs">
              Sistem Manajemen Aset & Analisis DGA Terintegrasi untuk PLN UPT
              Manado.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white">
                  Beranda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Fitur
                </a>
              </li>
              <li>
                <a onClick={onStart} href="#" className="hover:text-white" >
                  Panduan
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>PT. PLN (PERSERO) UPT MANADO</li>
              <li>Jl. Bethesda No. 32, Manado</li>
              <li>Sulawesi Utara</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-6 mt-12 pt-8 border-t border-slate-700 text-center text-xs text-slate-500">
          &copy; 2026 Kerja Praktek Teknik Informatika UNSRAT - PLN UPT Manado.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
