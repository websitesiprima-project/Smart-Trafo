// src/components/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Zap, Loader2, Lock, Mail, ArrowRight, Activity } from "lucide-react";
import { toast, Toaster } from "sonner"; // Pastikan Toaster diimport

const LoginPage = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  // Efek animasi saat mount
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

      <div className="min-h-screen flex bg-[#0f172a] font-sans overflow-hidden">
        {/* --- BAGIAN KIRI (IMAGE & BRANDING) --- */}
        <div
          className={`hidden lg:flex w-1/2 relative bg-gray-900 transition-all duration-1000 ease-out ${mounted ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"}`}
        >
          {/* Background Image dengan Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop"
              alt="Substation"
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
          </div>

          {/* Content Kiri */}
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B7A8F]/20 border border-[#1B7A8F]/30 text-[#4fd1c5] text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                <Activity size={14} /> Sistem Monitoring Real-time
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-tight">
                Smart Asset <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#f59e0b]">
                  Management
                </span>
              </h1>
              <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                Platform terintegrasi untuk analisis DGA, pemantauan kesehatan
                trafo, dan prediksi pemeliharaan berbasis AI.
              </p>
            </div>

            <div className="text-slate-500 text-sm">
              &copy; 2026 PT PLN (Persero). All rights reserved.
            </div>
          </div>
        </div>

        {/* --- BAGIAN KANAN (FORM LOGIN) --- */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
          {/* Dekorasi Background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1B7A8F] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FFD700] rounded-full blur-[100px] opacity-5 pointer-events-none"></div>

          <div
            className={`w-full max-w-md space-y-8 transition-all duration-1000 delay-300 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          >
            {/* Header Mobile Only (Logo) */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#1e293b] rounded-2xl flex items-center justify-center shadow-lg border border-slate-700 mb-4">
                <Zap className="text-[#FFD700]" size={32} fill="currentColor" />
              </div>
              <h2 className="text-2xl font-bold text-white">PLN SMART</h2>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white">
                Selamat Datang Kembali
              </h2>
              <p className="text-slate-400 mt-2">
                Masukan kredensial akun UPT Anda.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 mt-8">
              <div className="space-y-2 group">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-[#1B7A8F] transition-colors">
                  Email Korporat
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-[#1B7A8F] transition-colors" />
                  </div>
                  <input
                    type="email"
                    data-testid="email-input" // 🔥 Added for Testing
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-11 pr-4 py-3.5 bg-[#1e293b]/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1B7A8F]/50 focus:border-[#1B7A8F] transition-all"
                    placeholder="nama@pln.co.id"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-[#FFD700] transition-colors">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-[#FFD700] transition-colors" />
                  </div>
                  <input
                    type="password"
                    data-testid="password-input" // 🔥 Added for Testing
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-11 pr-4 py-3.5 bg-[#1e293b]/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700] transition-all"
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
              <p className="text-slate-500 text-sm">
                Lupa password atau kendala akses?{" "}
                <button
                  onClick={() =>
                    toast.info("Silakan hubungi Admin ULTG di Extension 123")
                  }
                  className="text-[#1B7A8F] font-bold hover:text-[#FFD700] transition-colors hover:underline"
                >
                  Hubungi IT Support
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
