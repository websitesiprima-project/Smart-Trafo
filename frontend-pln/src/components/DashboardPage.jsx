import React from "react";
import {
  FileText,
  Thermometer,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

// 1. IMPORT KOMPONEN DUVAL PENTAGON YANG BARU ANDA BUAT
import DuvalPentagon from "./DuvalPentagon";

const DashboardPage = ({
  formData,
  handleChange,
  handleSubmit,
  result,
  isDarkMode,
}) => {
  // Style Helper
  const cardClass = `p-6 rounded-xl shadow-sm border transition-all ${
    isDarkMode ? "bg-[#1e293b] border-slate-700" : "bg-white border-slate-200"
  }`;
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${
    isDarkMode ? "text-slate-400" : "text-slate-500"
  }`;
  const inputClass = `w-full p-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-[#1B7A8F] outline-none transition-all ${
    isDarkMode
      ? "bg-slate-900 border-slate-700 text-white"
      : "bg-gray-50 border-gray-300 text-gray-900"
  }`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6 border-gray-200/50">
        <div>
          <h2
            className={`text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-[#1B7A8F]"
            }`}
          >
            Formulir Uji DGA
          </h2>
          <p
            className={`mt-1 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Standar: IEEE C57.104-2019 • PLN UPT Manado
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700] rounded-lg text-sm font-bold">
            Metode: 90th Percentile
          </div>
          {/* Badge Baru untuk Duval */}
          <div className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500 rounded-lg text-sm font-bold">
            Duval Pentagon 1
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: IDENTITAS TRAFO */}
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100/10">
            <FileText className="text-[#1B7A8F]" />
            <h3
              className={`font-bold text-lg ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              I. Identitas Transformator
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Lokasi / Gardu Induk</label>
              <input
                type="text"
                name="lokasi_gi"
                value={formData.lokasi_gi}
                onChange={handleChange}
                placeholder="Contoh: GI Teling"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nama / Bay Trafo</label>
              <input
                type="text"
                name="nama_trafo"
                value={formData.nama_trafo}
                onChange={handleChange}
                placeholder="Contoh: IBT-1"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Merk Trafo</label>
              <input
                type="text"
                name="merk_trafo"
                value={formData.merk_trafo}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Serial Number (S/N)</label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tegangan</label>
                <input
                  type="text"
                  name="level_tegangan"
                  value={formData.level_tegangan}
                  onChange={handleChange}
                  placeholder="kV"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>MVA</label>
                <input
                  type="text"
                  name="mva"
                  value={formData.mva}
                  onChange={handleChange}
                  placeholder="MVA"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Tahun Buat</label>
              <input
                type="text"
                name="tahun_pembuatan"
                value={formData.tahun_pembuatan}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DATA SAMPLING */}
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100/10">
            <Thermometer className="text-[#1B7A8F]" />
            <h3
              className={`font-bold text-lg ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              II. Data Sampling Minyak
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Tanggal Sampling</label>
              <input
                type="date"
                name="tanggal_sampling"
                value={formData.tanggal_sampling}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Suhu Sampel (°C)</label>
              <input
                type="number"
                step="0.1"
                name="suhu_sampel"
                value={formData.suhu_sampel}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Petugas Sampling</label>
              <input
                type="text"
                name="diambil_oleh"
                value={formData.diambil_oleh}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: KONSENTRASI GAS */}
        <div className={`${cardClass} border-l-4 border-l-[#1B7A8F]`}>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100/10">
            <FlaskConical className="text-[#1B7A8F]" />
            <h3
              className={`font-bold text-lg ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              III. Konsentrasi Gas (PPM)
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map((gas) => (
              <div key={gas} className="group">
                <label
                  className={`block text-center mb-2 font-bold uppercase ${
                    isDarkMode ? "text-white" : "text-gray-700"
                  }`}
                >
                  {gas}
                </label>
                <input
                  type="number"
                  name={gas}
                  value={formData[gas] || 0}
                  onChange={handleChange}
                  className={`${inputClass} text-center font-mono font-bold text-lg`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ACTION BUTTON */}
        <button
          type="submit"
          className="w-full py-4 bg-[#FFD700] hover:bg-[#e6c200] text-black font-bold text-lg rounded-xl shadow-lg transform transition hover:scale-[1.01] flex items-center justify-center gap-2"
        >
          <Activity size={24} /> ANALISA KONDISI TRAFO SEKARANG
        </button>
      </form>

      {/* HASIL ANALISA (MUNCUL SETELAH SUBMIT) */}
      {result && (
        <div
          className={`mt-12 p-8 rounded-2xl border-2 animate-in fade-in slide-in-from-bottom-10 ${
            result.ieee_status.includes("Normal")
              ? "bg-green-50 border-green-500 text-green-900"
              : result.ieee_status.includes("KRITIS")
              ? "bg-red-50 border-red-500 text-red-900"
              : "bg-orange-50 border-orange-500 text-orange-900"
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* KOLOM KIRI: STATUS & DIAGNOSA */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  {result.ieee_status.includes("Normal") ? (
                    <CheckCircle size={48} />
                  ) : (
                    <AlertTriangle size={48} />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase opacity-70 mb-1">
                    Status IEEE C57.104-2019
                  </h4>
                  <div className="text-3xl font-extrabold leading-tight">
                    {result.ieee_status}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/60 rounded-xl shadow-sm">
                <p className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Activity size={20} className="opacity-50" /> Diagnosa Teknis:
                </p>
                <p className="leading-relaxed text-lg font-medium">
                  {result.diagnosis}
                </p>
              </div>

              {/* AI PREDICTION */}
              <div className="pt-4 border-t border-black/10 flex items-center gap-3">
                <div className="px-3 py-1 bg-black/10 rounded text-xs font-bold">
                  AI CLASSIFICATION
                </div>
                <p className="font-mono text-sm">{result.ai_status}</p>
              </div>
            </div>

            {/* KOLOM KANAN: VISUALISASI */}
            <div className="space-y-4">
              {/* 1. TDCG SCORE */}
              <div className="text-center p-6 bg-white/80 rounded-xl shadow-sm">
                <p className="text-sm font-bold text-gray-500 mb-1">
                  Total Combustible Gas
                </p>
                <div className="text-5xl font-black tracking-tighter flex items-end justify-center gap-1">
                  {result.tdcg_value.toFixed(0)}
                  <span className="text-sm font-bold text-gray-400 mb-2">
                    ppm
                  </span>
                </div>
              </div>

              {/* 2. DUVAL PENTAGON (KOMPONEN BARU) */}
              <div className="relative group">
                <div
                  className={`rounded-xl overflow-hidden shadow-lg ${
                    isDarkMode ? "bg-slate-800" : "bg-white"
                  }`}
                >
                  <DuvalPentagon
                    h2={formData.h2}
                    ch4={formData.ch4}
                    c2h6={formData.c2h6}
                    c2h4={formData.c2h4}
                    c2h2={formData.c2h2}
                  />
                </div>
                {/* Tooltip Hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                  Visualisasi Gas
                </div>
              </div>
            </div>
          </div>

          {/* VOLTY REPLY (DARI LLAMA 3) */}
          <div className="mt-8 p-5 bg-blue-600 text-white rounded-xl shadow-lg flex gap-4 items-start animate-pulse-once">
            <div className="text-3xl bg-white/20 p-2 rounded-lg">🤖</div>
            <div className="flex-1">
              <p className="font-bold text-xs uppercase opacity-70 mb-1 tracking-wider">
                Rekomendasi Cerdas Volty:
              </p>
              <p className="text-sm leading-relaxed font-medium">
                "{result.volty_chat}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
