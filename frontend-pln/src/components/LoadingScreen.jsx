import React from "react";
import VoltyMascot from "./VoltyMascot";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce-slow">
        <VoltyMascot mood="thinking" />
        <h3 className="mt-6 text-xl font-bold text-[#1B7A8F]">
          Sedang Menganalisis...
        </h3>
        <p className="text-slate-500 text-sm mt-2">
          Menghitung rasio gas IEEE...
        </p>

        {/* Loading Bar ala Duolingo */}
        <div className="w-48 h-3 bg-slate-200 rounded-full mt-4 overflow-hidden border border-slate-300">
          <div className="h-full bg-[#FFD700] animate-progress-stripes"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
