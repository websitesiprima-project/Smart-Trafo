import React, { useEffect, useState } from "react";
import {
  FileText,
  Thermometer,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
  Printer,
  Info,
} from "lucide-react";
import DuvalPentagon from "./DuvalPentagon";
// Pastikan DuvalTriangle diimport jika digunakan, atau hapus jika tidak
// import DuvalTriangle from "./DuvalTriangle";
import { allGIs, trafoDatabase } from "../data/assetData";
import { supabase } from "../lib/supabaseClient";

const InputFormPage = ({
  formData,
  handleChange,
  setFormData,
  handleSubmit,
  result,
  isDarkMode,
  isLoading,
}) => {
  // --- STATE UNTUK GI & TRAFO DINAMIS ---
  const [dynamicGIs, setDynamicGIs] = useState([]);
  const [dynamicTrafos, setDynamicTrafos] = useState([]);

  // --- FUNGSI UNTUK MENGURUTKAN TRAFO ---
  const sortTrafos = (trafos) => {
    return [...trafos].sort((a, b) => {
      const aName = a.nama_trafo || "";
      const bName = b.nama_trafo || "";

      // Extract tipe (TD, GT, IBT, dll) dan nomor
      const aMatch = aName.match(/^([A-Z]+)\s*#?(\d+)$/i);
      const bMatch = bName.match(/^([A-Z]+)\s*#?(\d+)$/i);

      if (!aMatch || !bMatch) return aName.localeCompare(bName);

      const aType = aMatch[1].toUpperCase();
      const bType = bMatch[1].toUpperCase();
      const aNum = parseInt(aMatch[2], 10);
      const bNum = parseInt(bMatch[2], 10);

      // Urutan prioritas: TD, GT, IBT, lainnya
      const typeOrder = { TD: 1, GT: 2, IBT: 3 };
      const aOrder = typeOrder[aType] || 999;
      const bOrder = typeOrder[bType] || 999;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return aNum - bNum;
    });
  };

  // --- LOGIKA FETCH DATA DARI SUPABASE ---
  useEffect(() => {
    const fetchAssets = async () => {
      // Ambil data unik untuk lokasi_gi
      const { data, error } = await supabase
        .from("assets_trafo")
        .select("lokasi_gi");

      if (data) {
        // Filter duplikat GI
        const uniqueGIs = [...new Set(data.map((item) => item.lokasi_gi))];
        setDynamicGIs(uniqueGIs);
      }
    };

    fetchAssets();
  }, []);

  // --- LOGIKA LOAD TRAFO SAAT GI DIPILIH ---
  useEffect(() => {
    const fetchTrafos = async () => {
      if (formData.lokasi_gi) {
        const { data, error } = await supabase
          .from("assets_trafo")
          .select("*")
          .eq("lokasi_gi", formData.lokasi_gi);

        if (data) {
          setDynamicTrafos(data);
        }
      } else {
        setDynamicTrafos([]);
      }
    };

    fetchTrafos();
  }, [formData.lokasi_gi]);

  // --- LOGIKA AUTOFILL ---
  useEffect(() => {
    if (typeof setFormData !== "function") return;

    if (formData.lokasi_gi && formData.nama_trafo) {
      // Cari trafo yang dipilih dari state dynamicTrafos
      const selectedTrafo = dynamicTrafos.find(
        (t) => t.nama_trafo === formData.nama_trafo
      );

      if (selectedTrafo) {
        setFormData((prev) => ({
          ...prev,
          merk_trafo: selectedTrafo.merk || "",
          serial_number: selectedTrafo.serial_number || "",
          tahun_pembuatan: selectedTrafo.tahun_pembuatan || "",
          level_tegangan: selectedTrafo.level_tegangan || "",
          // Note: jenis_minyak tidak ada di tabel assets_trafo default, sesuaikan jika ada
          jenis_minyak: prev.jenis_minyak || "",
        }));
      }
    }
  }, [formData.lokasi_gi, formData.nama_trafo, dynamicTrafos, setFormData]);

  // --- STYLING CONSTANTS ---
  const theme = {
    bg: isDarkMode ? "bg-[#0f172a]" : "bg-gray-50",
    card: isDarkMode
      ? "bg-[#1e293b] border-slate-700 shadow-lg"
      : "bg-white border-gray-200 shadow-sm",
    input: isDarkMode
      ? "bg-slate-900 border-slate-700 text-white focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 focus:border-[#1B7A8F]",
    readOnly: isDarkMode
      ? "bg-slate-800 text-gray-400"
      : "bg-gray-100 text-gray-500",
    text: isDarkMode ? "text-gray-100" : "text-gray-800",
    subText: isDarkMode ? "text-gray-400" : "text-gray-500",
    label: isDarkMode ? "text-gray-400" : "text-gray-500",
    divider: isDarkMode ? "border-slate-700" : "border-gray-100",
  };

  const labelClass = `block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${theme.label}`;
  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all ${theme.input}`;
  const readOnlyClass = `${inputClass} cursor-not-allowed ${theme.readOnly}`;

  // Data Tabel Gas
  const gasTableData = [
    { name: "Hidrogen", rumus: "H2", value: formData.h2 },
    { name: "Metana", rumus: "CH4", value: formData.ch4 },
    { name: "Asetilen", rumus: "C2H2", value: formData.c2h2 },
    { name: "Etilen", rumus: "C2H4", value: formData.c2h4 },
    { name: "Etana", rumus: "C2H6", value: formData.c2h6 },
    { name: "CO", rumus: "CO", value: formData.co },
    { name: "CO2", rumus: "CO2", value: formData.co2 },
  ];

  return (
    <div
      className={`min-h-screen pb-20 ${theme.bg} transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HEADER SIMPLE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2
              className={`text-2xl md:text-3xl font-extrabold ${
                isDarkMode ? "text-white" : "text-[#1B7A8F]"
              }`}
            >
              Formulir Uji DGA
            </h2>
            <p className={`text-sm mt-1 ${theme.subText}`}>
              IEEE C57.104-2019 & IEC 60599 Standard Assessment
            </p>
          </div>
        </div>

        {/* --- FORM SECTION --- */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* LEFT COL: IDENTITAS & SAMPLING (Span 7) */}
          <div className={`lg:col-span-7 rounded-2xl p-6 border ${theme.card}`}>
            {/* 1. IDENTITAS */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed border-gray-500/30">
                <FileText className="text-[#1B7A8F]" size={18} />
                <h3 className={`font-bold text-base uppercase ${theme.text}`}>
                  Identitas Aset
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Gardu Induk</label>
                    <select
                      name="lokasi_gi"
                      value={formData.lokasi_gi}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    >
                      <option value="">- Pilih GI -</option>
                      {/* Render Dynamic GIs dari Supabase */}
                      {dynamicGIs
                        .sort((a, b) => a.localeCompare(b))
                        .map((giName, idx) => (
                          <option key={idx} value={giName}>
                            {giName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Unit Trafo</label>
                    <select
                      name="nama_trafo"
                      value={formData.nama_trafo}
                      onChange={handleChange}
                      className={inputClass}
                      disabled={!formData.lokasi_gi}
                      required
                    >
                      <option value="">- Pilih Trafo -</option>
                      {/* Render Dynamic Trafos berdasarkan GI yang dipilih */}
                      {sortTrafos(dynamicTrafos).map((t, idx) => (
                        <option key={idx} value={t.nama_trafo}>
                          {t.nama_trafo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Readonly Fields - Compact Grid */}
                <div>
                  <label className={labelClass}>Merk</label>
                  <input
                    value={formData.merk_trafo}
                    readOnly
                    className={readOnlyClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>S/N</label>
                  <input
                    value={formData.serial_number}
                    readOnly
                    className={readOnlyClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tahun</label>
                  <input
                    value={formData.tahun_pembuatan}
                    readOnly
                    className={readOnlyClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tegangan</label>
                  <input
                    value={formData.level_tegangan}
                    readOnly
                    className={readOnlyClass}
                  />
                </div>
              </div>
            </div>

            {/* 2. SAMPLING */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed border-gray-500/30">
                <Thermometer className="text-orange-500" size={18} />
                <h3 className={`font-bold text-base uppercase ${theme.text}`}>
                  Data Sampling
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Tanggal Uji</label>
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
                  <label className={labelClass}>Petugas</label>
                  <input
                    type="text"
                    name="diambil_oleh"
                    value={formData.diambil_oleh}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Nama Petugas"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COL: GAS INPUT (Span 5) */}
          <div className={`lg:col-span-5 flex flex-col h-full`}>
            <div className={`flex-1 rounded-2xl p-6 border mb-4 ${theme.card}`}>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed border-gray-500/30">
                <FlaskConical className="text-green-500" size={18} />
                <h3 className={`font-bold text-base uppercase ${theme.text}`}>
                  Konsentrasi Gas (ppm)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {["h2", "ch4", "c2h2", "c2h4", "c2h6"].map((gas) => (
                  <div key={gas} className="relative">
                    <label
                      className={`absolute left-3 top-2.5 text-xs font-bold uppercase ${
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {gas}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name={gas}
                      value={formData[gas]}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-2.5 rounded-lg border text-right font-mono text-lg font-bold outline-none focus:ring-1 focus:ring-green-500 transition-all ${
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      placeholder="0"
                    />
                  </div>
                ))}
                {/* CO & CO2 Full Width */}
                {["co", "co2"].map((gas) => (
                  <div key={gas} className="relative">
                    <label
                      className={`absolute left-3 top-2.5 text-xs font-bold uppercase ${
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {gas}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name={gas}
                      value={formData[gas]}
                      onChange={handleChange}
                      className={`w-full pl-14 pr-4 py-2.5 rounded-lg border text-right font-mono text-lg font-bold outline-none focus:ring-1 focus:ring-green-500 transition-all ${
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#1B7A8F] hover:bg-[#166678] text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="animate-pulse">Sedang Menganalisis...</span>
              ) : (
                <>
                  <Activity size={20} /> ANALISA HASIL
                </>
              )}
            </button>
          </div>
        </form>

        {/* --- RESULT SECTION --- */}
        {result && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 space-y-6">
            {/* 1. TOP STATUS BAR (Slim & Impactful) */}
            <div
              className={`rounded-xl border p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md relative overflow-hidden ${
                result.ieee_status.includes("Normal")
                  ? "bg-emerald-50 border-emerald-200"
                  : result.ieee_status.includes("KRITIS")
                  ? "bg-rose-50 border-rose-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              {/* Background Accent */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 ${
                  result.ieee_status.includes("Normal")
                    ? "bg-emerald-500"
                    : result.ieee_status.includes("KRITIS")
                    ? "bg-rose-500"
                    : "bg-amber-500"
                }`}
              ></div>

              <div className="flex items-center gap-4 z-10">
                <div
                  className={`p-3 rounded-full ${
                    result.ieee_status.includes("Normal")
                      ? "bg-emerald-100 text-emerald-600"
                      : result.ieee_status.includes("KRITIS")
                      ? "bg-rose-100 text-rose-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {result.ieee_status.includes("Normal") ? (
                    <CheckCircle size={32} />
                  ) : (
                    <AlertTriangle size={32} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 text-gray-600">
                    Kesimpulan IEEE C57.104
                  </p>
                  <h3
                    className={`text-2xl font-black tracking-tight ${
                      result.ieee_status.includes("Normal")
                        ? "text-emerald-800"
                        : result.ieee_status.includes("KRITIS")
                        ? "text-rose-800"
                        : "text-amber-800"
                    }`}
                  >
                    {result.ieee_status}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-6 z-10">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    TDCG Level
                  </p>
                  <p className="text-2xl font-mono font-bold text-gray-800">
                    {result.tdcg_value?.toFixed(0)}{" "}
                    <span className="text-sm font-sans text-gray-500">ppm</span>
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-bold shadow-sm transition-all"
                >
                  <Printer size={16} /> Cetak
                </button>
              </div>
            </div>

            {/* 2. CHART & TABLE GRID (Balanced Height) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* TABLE (Span 4) */}
              <div
                className={`lg:col-span-4 rounded-2xl border flex flex-col ${theme.card}`}
              >
                <div
                  className={`p-4 border-b ${theme.divider} flex justify-between items-center bg-gray-50/50`}
                >
                  <h4 className={`font-bold text-sm uppercase ${theme.text}`}>
                    Data Gas
                  </h4>
                  <Info size={16} className="text-gray-400" />
                </div>
                <div className="p-0 flex-1 overflow-hidden">
                  <table className="w-full text-sm h-full">
                    <tbody className="divide-y divide-gray-100">
                      {gasTableData.map((row, i) => (
                        <tr
                          key={i}
                          className={
                            isDarkMode
                              ? "hover:bg-slate-700"
                              : "hover:bg-gray-50"
                          }
                        >
                          <td
                            className={`px-4 py-3 font-medium ${theme.subText}`}
                          >
                            {row.name} ({row.rumus})
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${theme.text}`}
                          >
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DUVAL CHART (Span 8) */}
              <div
                className={`lg:col-span-8 rounded-2xl border p-4 flex flex-col items-center justify-center relative min-h-[400px] ${theme.card}`}
              >
                <h4
                  className={`absolute top-4 left-4 font-bold text-sm uppercase ${theme.text}`}
                >
                  Visualisasi Duval Pentagon
                </h4>
                <div className="w-full h-full flex items-center justify-center p-4">
                  <div className="w-full max-w-[450px] aspect-square">
                    <DuvalPentagon
                      h2={formData.h2}
                      ch4={formData.ch4}
                      c2h6={formData.c2h6}
                      c2h4={formData.c2h4}
                      c2h2={formData.c2h2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DIAGNOSIS & AI (Split View) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TEKNIS / ROGERS */}
              <div className={`rounded-2xl border p-6 space-y-6 ${theme.card}`}>
                <div className="flex items-center gap-2 pb-2 border-b border-gray-500/20">
                  <Activity className="text-blue-500" size={20} />
                  <h4 className={`font-bold text-lg ${theme.text}`}>
                    Diagnosis Teknis
                  </h4>
                </div>

                <div className="space-y-4">
                  <div
                    className={`p-3 rounded-lg border-l-4 ${
                      isDarkMode
                        ? "bg-slate-900 border-purple-500"
                        : "bg-purple-50 border-purple-500"
                    }`}
                  >
                    <p className="text-xs uppercase font-bold text-purple-600 mb-1">
                      Metode Rogers Ratio
                    </p>
                    <p className={`font-bold text-lg ${theme.text}`}>
                      {result.rogers_diagnosis}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`p-3 rounded-lg border ${
                        isDarkMode
                          ? "bg-slate-900 border-slate-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        Key Gas Dominan
                      </p>
                      <p className={`font-bold ${theme.text}`}>
                        {result.key_gas}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-lg border ${
                        result.paper_health?.status.includes("Fault")
                          ? "bg-red-50 border-red-200"
                          : isDarkMode
                          ? "bg-slate-900 border-slate-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        Isolasi Kertas (CO2/CO)
                      </p>
                      <p
                        className={`font-bold ${
                          result.paper_health?.status.includes("Fault")
                            ? "text-red-600"
                            : theme.text
                        }`}
                      >
                        {result.paper_health ? result.paper_health.status : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI ANALYSIS */}
              <div
                className={`rounded-2xl border p-6 relative overflow-hidden ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-700"
                    : "bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-sm"
                }`}
              >
                {/* Decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-10"></div>

                <div className="flex items-center gap-2 pb-4 border-b border-blue-500/20 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                    <Info size={18} />
                  </div>
                  <h4 className={`font-bold text-lg text-blue-600`}>
                    Volty AI Analysis
                  </h4>
                </div>

                <div
                  className={`prose prose-sm max-w-none font-medium leading-relaxed whitespace-pre-line ${
                    isDarkMode ? "prose-invert text-gray-300" : "text-gray-700"
                  }`}
                >
                  {result.volty_chat
                    ? result.volty_chat
                    : "Tidak ada analisis tambahan."}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InputFormPage;
