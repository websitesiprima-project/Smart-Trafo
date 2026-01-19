// src/components/LoginPage.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Zap, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

const LoginPage = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      toast.success("Login Berhasil! Selamat datang.");
      
      // Delay untuk smooth transition ke dashboard
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Callback ke App.jsx untuk mengubah state
      if (onLoginSuccess) onLoginSuccess(data.session);
    } catch (error) {
      toast.error("Login Gagal: " + error.message);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Custom Loading Overlay untuk Login */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-md">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#FFD700] rounded-2xl flex items-center justify-center shadow-2xl mb-6 mx-auto animate-pulse">
              <Zap className="text-[#1B7A8F]" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Mengautentikasi...</h3>
            <p className="text-slate-400">Memuat dashboard Anda</p>
            <div className="w-64 h-2 bg-slate-700 rounded-full mt-6 overflow-hidden mx-auto">
              <div className="h-full bg-[#FFD700] animate-progress-bar"></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="bg-[#1e293b] w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-700">
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
            <Zap className="text-[#1B7A8F]" size={40} />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">PLN Smart Trafo</h1>
          <p className="text-slate-400 text-sm mt-2">
            Silakan masuk untuk mengakses dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-3 text-slate-500"
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#1B7A8F] transition-colors"
                placeholder="admin@pln.co.id"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-3 text-slate-500"
                size={18}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#1B7A8F] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B7A8F] hover:bg-[#155d6d] text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Masuk Aplikasi"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Belum punya akun? Hubungi Admin UPT Manado.
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default LoginPage;
