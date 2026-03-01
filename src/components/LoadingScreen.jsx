import React from "react";
import { Zap } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] text-white">
      {/* Animasi Icon Petir (CSS Only - Anti Error) */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#1B7A8F] blur-xl opacity-20 rounded-full animate-pulse"></div>
        <div className="w-20 h-20 bg-gradient-to-br from-[#1B7A8F] to-[#0f172a] rounded-2xl flex items-center justify-center border border-[#1B7A8F]/30 shadow-2xl relative z-10 animate-bounce">
          <Zap size={40} className="text-[#F1C40F]" fill="#F1C40F" />
        </div>
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-2 flex items-center gap-2">
        PLN <span className="text-[#F1C40F]">SMART</span>
      </h2>

      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
      </div>

      <p className="text-xs text-slate-500 mt-4 font-mono">Memuat Sistem...</p>
    </div>
  );
};

export default LoadingScreen;
