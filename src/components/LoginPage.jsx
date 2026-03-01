// src/components/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Zap, Loader2, Lock, Mail, ArrowRight, Activity } from "lucide-react";
import { toast, Toaster } from "sonner"; // Ensure Toaster is imported
import ThemeToggle from "./Themetoggle";

const LoginPage = ({ onLoginSuccess, isDarkMode, toggleTheme }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  // Animation effect on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      toast.success("Login Berhasil! Mengalihkan...", {
        icon: "⚡",
        style: {
          background: "#10b981",
          color: "#fff",
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (onLoginSuccess) onLoginSuccess(data.session);
    } catch (error) {
      toast.error("Login Gagal: " + error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* LOADING OVERLAY FULLSCREEN */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a]/90 backdrop-blur-xl transition-all duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FFD700] blur-2xl opacity-20 rounded-full animate-pulse"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl flex items-center justify-center shadow-2xl border border-[#1B7A8F]/30 relative z-10">
              <Zap
                className="text-[#FFD700] animate-bounce"
                size={48}
                fill="currentColor"
              />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-8 tracking-wider">
            PLN SMART
          </h3>
          <p className="text-[#1B7A8F] text-sm font-medium animate-pulse mt-2">
            Memverifikasi Kredensial...
          </p>
        </div>
      )}

      <div className={`min-h-screen flex font-sans overflow-hidden ${isDarkMode ? "bg-[#0f172a]" : "bg-gradient-to-br from-slate-50 to-slate-100"}`}>
        {/* Theme Toggle Button - Fixed Position */}
        <div className="fixed bottom-3 left-20 z-50">
          <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        </div>

        {/* --- LEFT SECTION (IMAGE & BRANDING) --- */}
        <div
          className={`hidden lg:flex w-1/2 relative transition-all duration-1000 ease-out ${isDarkMode ? "bg-gray-900" : "bg-gradient-to-br from-[#1B7A8F] to-[#155d6d]"} ${mounted ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"}`}
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop"
              alt="Substation"
              className={`w-full h-full object-cover mix-blend-overlay ${isDarkMode ? "opacity-40" : "opacity-20"}`}
            />
            <div className={`absolute inset-0 ${isDarkMode ? "bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" : "bg-gradient-to-t from-[#1B7A8F] via-[#1B7A8F]/60 to-transparent"}`}></div>
          </div>

          {/* Left Content */}
          <div className="relative z-10 flex flex-col justify-between p-16 w-full">
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/20/Logo_PLN.svg"
                alt="PLN Logo"
                className="h-12 drop-shadow-lg"
              />
              <div className="h-10 w-[1px] bg-gray-500/50"></div>
              <span className="text-white font-bold text-xl tracking-widest opacity-80">
                UPT MANADO
              </span>
            </div>

            <div className="space-y-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm text-xs font-bold uppercase tracking-wider ${isDarkMode ? "bg-[#1B7A8F]/20 border border-[#1B7A8F]/30 text-[#4fd1c5]" : "bg-white/30 border border-white/50 text-white"}`}>
                <Activity size={14} /> Sistem Monitoring Real-time
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-tight">
                Smart Asset <br />
                <span className={`text-transparent bg-clip-text ${isDarkMode ? "bg-gradient-to-r from-[#FFD700] to-[#f59e0b]" : "bg-gradient-to-r from-white to-slate-100"}`}>
                  Management
                </span>
              </h1>
              <p className={`text-lg max-w-md leading-relaxed ${isDarkMode ? "text-slate-400" : "text-white/90"}`}>
                Platform terintegrasi untuk analisis DGA, pemantauan kesehatan
                trafo, dan prediksi pemeliharaan berbasis AI.
              </p>
            </div>

            <div className={`text-sm ${isDarkMode ? "text-slate-500" : "text-white/70"}`}>
              &copy; 2026 PT PLN (Persero). All rights reserved.
            </div>
          </div>
        </div>

        {/* --- RIGHT SECTION (LOGIN FORM) --- */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-6 relative ${isDarkMode ? "" : "bg-white"}`}>
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1B7A8F] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FFD700] rounded-full blur-[100px] opacity-5 pointer-events-none"></div>

          <div
            className={`w-full max-w-md transition-all duration-1000 delay-300 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            {/* Shadow Layer */}
            <div className={`absolute inset-0 rounded-2xl blur-xl ${isDarkMode ? "bg-slate-900/40" : "bg-slate-300/40"}`} style={{maxWidth: '28rem'}}></div>
            
            {/* Card Container */}
            <div className={`relative rounded-2xl p-8 sm:p-10 backdrop-blur-sm border ${isDarkMode ? "bg-slate-800/80 border-slate-700/50" : "bg-slate-100/80 border-slate-200/50"} shadow-2xl`}>
              {/* Mobile Only Header (Logo) */}
              <div className="lg:hidden flex flex-col items-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border mb-4 ${isDarkMode ? "bg-[#1e293b] border-slate-700" : "bg-[#1e293b] border-blue-200"}`}>
                  <Zap className="text-[#FFD700]" size={32} fill="currentColor" />
                </div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>PLN SMART</h2>
              </div>

              <div className="text-center lg:text-left">
                <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                  Selamat Datang Kembali
                </h2>
                <p className={`mt-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Masukan kredensial akun UPT Anda.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6 mt-8">
              <div className="space-y-2 group">
                <label className={`text-xs font-semibold uppercase tracking-wider ml-1 transition-colors ${isDarkMode ? "text-slate-400 group-focus-within:text-[#1B7A8F]" : "text-slate-700 group-focus-within:text-[#1B7A8F]"}`}>
                  Email Korporat
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className={`h-5 w-5 transition-colors ${isDarkMode ? "text-slate-500 group-focus-within:text-[#1B7A8F]" : "text-slate-400 group-focus-within:text-[#1B7A8F]"}`} />
                  </div>
                  <input
                    type="email"
                    data-testid="email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`block w-full pl-11 pr-4 py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#1B7A8F]/50 focus:border-[#1B7A8F] shadow-sm ${isDarkMode ? "bg-slate-900/50 border-2 border-blue-400 text-slate-100 placeholder-slate-500" : "bg-white border-2 border-[#1B7A8F] text-slate-900 placeholder-slate-400"}`}
                    placeholder="nama@pln.co.id"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className={`text-xs font-semibold uppercase tracking-wider ml-1 transition-colors ${isDarkMode ? "text-slate-400 group-focus-within:text-[#FFD700]" : "text-slate-700 group-focus-within:text-[#FFD700]"}`}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors ${isDarkMode ? "text-slate-500 group-focus-within:text-[#FFD700]" : "text-slate-400 group-focus-within:text-[#FFD700]"}`} />
                  </div>
                  <input
                    type="password"
                    data-testid="password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`block w-full pl-11 pr-4 py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700] shadow-sm ${isDarkMode ? "bg-slate-900/50 border-2 border-cyan-400 text-slate-100 placeholder-slate-500" : "bg-white border-2 border-[#1B7A8F] text-slate-900 placeholder-slate-400"}`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="login-button" // 🔥 Added for Testing
                disabled={loading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-[#1B7A8F] to-[#155d6d] hover:to-[#1B7A8F] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#1B7A8F]/20 transition-all active:scale-[0.98]"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk Aplikasi</span>
                      <ArrowRight
                        size={20}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </div>
              </button>
              </form>

              <div className="pt-6 text-center">
                <div className={`text-sm ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
                  Lupa password atau kendala akses?{" "}
                  <button
                    onClick={() =>
                      toast.info("Silakan hubungi Admin ULTG di Extension 123")
                    }
                    className={`font-bold transition-colors hover:underline ${isDarkMode ? "text-[#1B7A8F] hover:text-[#FFD700]" : "text-[#1B7A8F] hover:text-[#16697a]"}`}
                  >
                    Hubungi SuperAdmin (UPT MANADO)
                  </button>
                </div>
              </div>
            </div>
            {/* End Card Container */}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
