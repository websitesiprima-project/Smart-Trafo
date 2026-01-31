import React from "react";
import { Zap, Activity, ArrowRight } from "lucide-react";

// 1. Tambahkan prop 'onGuide' disini
const LandingPage = ({ onStart, onGuide, isDarkMode }) => {
  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${
        isDarkMode ? "bg-[#0f172a] text-white" : "bg-white text-slate-800"
      }`}
    >
      {/* ... (NAVBAR CODE TETAP SAMA) ... */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
            alt="Logo PLN"
            className="w-8 h-12 object-contain"
          />
          <div className="hidden md:block">
            <h1
              className={`text-xl font-bold tracking-tight ${
                isDarkMode ? "text-white" : "text-[#1B7A8F]"
              }`}
            >
              PLN <span className="text-[#FFD700]">SMART</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-semibold">
              UPT Manado
            </p>
          </div>
        </div>
        <div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isDarkMode
                ? "border-[#FFD700] text-[#FFD700]"
                : "border-[#1B7A8F] text-[#1B7A8F]"
            }`}
          >
            Ver 1.0 (Beta)
          </span>
        </div>
      </nav>

      {/* ... (HERO SECTION) ... */}
      <header className="flex-1 flex items-center relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-2/3 h-full skew-x-12 translate-x-32 z-0 opacity-10 ${
            isDarkMode ? "bg-[#17A2B8]" : "bg-[#1B7A8F]"
          }`}
        ></div>

        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10 py-12 md:py-0">
          <div className="space-y-8 animate-in slide-in-from-left-10 duration-700">
            {/* ... (Kode Label & Judul Tetap Sama) ... */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B7A8F]/10 border border-[#1B7A8F]/20">
              <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse"></span>
              <span
                className={`text-xs font-bold tracking-wide ${
                  isDarkMode ? "text-[#17A2B8]" : "text-[#1B7A8F]"
                }`}
              >
                SISTEM CERDAS PEMANTAUAN TRAFO
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Deteksi Dini, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B7A8F] to-[#17A2B8]">
                Cegah Kegagalan.
              </span>
            </h1>

            <p
              className={`text-lg md:text-xl max-w-lg leading-relaxed ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Aplikasi monitoring kesehatan Transformator berbasis{" "}
              <strong>Artificial Intelligence</strong> dan Standar{" "}
              <strong>IEEE C57.104</strong> untuk diagnosis DGA yang akurat dan
              real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onStart}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-[#1B7A8F] hover:bg-[#156b7d] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#1B7A8F]/30 transition-all active:scale-95"
              >
                Mulai Analisis
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 2. Tambahkan onClick={onGuide} disini */}
              <button
                onClick={onGuide}
                className={`px-8 py-4 rounded-xl font-bold border transition-all ${
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800 text-white"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                Pelajari Standar
              </button>
            </div>

            {/* ... (Sisa Kode Tetap Sama) ... */}
            <div className="pt-6 border-t border-slate-500/20">
              <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
                Didukung Oleh Standar:
              </p>
              <div className="flex gap-4 opacity-70 grayscale hover:grayscale-0 transition-all">
                <span className="font-bold text-sm border-b-2 border-[#17A2B8]">
                  IEEE C57.104
                </span>
                <span className="font-bold text-sm border-b-2 border-[#17A2B8]">
                  IEC 60599
                </span>
                <span className="font-bold text-sm border-b-2 border-[#17A2B8]">
                  SPLN T5.004
                </span>
              </div>
            </div>
          </div>

          <div className="relative animate-in slide-in-from-right-10 duration-1000 hidden md:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 group">
              <div className="absolute inset-0 bg-[#1B7A8F]/20 group-hover:bg-transparent transition-colors z-10"></div>
              <img
                src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=1000"
                alt="High Voltage Transformer"
                className="w-full h-[500px] object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            {/* ... Floating Cards Tetap Sama ... */}
            <div
              className={`absolute -bottom-10 -left-10 p-5 rounded-xl shadow-xl border backdrop-blur-md flex items-center gap-4 animate-bounce-slow ${
                isDarkMode
                  ? "bg-[#1e293b]/90 border-slate-700"
                  : "bg-white/90 border-slate-200"
              }`}
            >
              <div className="p-3 bg-[#FFD700]/20 rounded-full text-[#FFD700]">
                {" "}
                <Zap size={24} fill="currentColor" />{" "}
              </div>
              <div>
                {" "}
                <p className="text-xs font-bold opacity-60 uppercase">
                  Diagnosis Cepat
                </p>{" "}
                <p className="text-lg font-bold">&lt; 10 Detik</p>{" "}
              </div>
            </div>
            <div
              className={`absolute -top-5 -right-5 p-5 rounded-xl shadow-xl border backdrop-blur-md flex items-center gap-4 animate-bounce-slow delay-700 ${
                isDarkMode
                  ? "bg-[#1e293b]/90 border-slate-700"
                  : "bg-white/90 border-slate-200"
              }`}
            >
              <div className="p-3 bg-[#17A2B8]/20 rounded-full text-[#17A2B8]">
                {" "}
                <Activity size={24} />{" "}
              </div>
              <div>
                {" "}
                <p className="text-xs font-bold opacity-60 uppercase">
                  Akurasi AI
                </p>{" "}
                <p className="text-lg font-bold">91.5%</p>{" "}
              </div>
            </div>
          </div>
        </div>
      </header>

      <footer className="py-6 text-center opacity-40 text-xs">
        &copy; 2025 Kerja Praktek Teknik Informatika UNSRAT - PLN UPT Manado
      </footer>
    </div>
  );
};

export default LandingPage;
