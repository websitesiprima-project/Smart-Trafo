import React, { useEffect } from "react";
import {
  FileText,
  Thermometer,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import DuvalPentagon from "./DuvalPentagon";
import DuvalTriangle from "./DuvalTriangle";
import { allGIs, trafoDatabase } from "../data/assetData";

const InputFormPage = ({
  formData,
  handleChange,
  setFormData,
  handleSubmit,
  result,
  isDarkMode,
  isLoading,
}) => {
  // --- LOGIKA AUTOFILL ---
  useEffect(() => {
    if (typeof setFormData !== "function") return;
    if (!trafoDatabase) return;

    if (formData.lokasi_gi && formData.nama_trafo) {
      const giData = trafoDatabase[formData.lokasi_gi];
      if (!giData) return;

      const selectedTrafo = giData.find((t) => t.name === formData.nama_trafo);

      if (selectedTrafo) {
        setFormData((prev) => ({
          ...prev,
          merk_trafo: selectedTrafo.merk || "",
          serial_number: selectedTrafo.sn || "",
          tahun_pembuatan: selectedTrafo.year || "",
          level_tegangan: selectedTrafo.volt || "",
          jenis_minyak: selectedTrafo.oilType || prev.jenis_minyak || "",
        }));
      }
    }
  }, [formData.lokasi_gi, formData.nama_trafo, setFormData]);

  // --- STYLING HELPERS ---
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
  const readOnlyClass = `${inputClass} opacity-70 cursor-not-allowed ${
    isDarkMode ? "bg-slate-800" : "bg-gray-100"
  }`;

  // Data Tabel Gas
  const gasTableData = [
    { no: 1, name: "Hidrogen", rumus: "H2", value: formData.h2 },
    { no: 2, name: "Metana", rumus: "CH4", value: formData.ch4 },
    { no: 3, name: "Asetilen", rumus: "C2H2", value: formData.c2h2 },
    { no: 4, name: "Etilen", rumus: "C2H4", value: formData.c2h4 },
    { no: 5, name: "Etana", rumus: "C2H6", value: formData.c2h6 },
    { no: 6, name: "Karbon Monoksida", rumus: "CO", value: formData.co },
    { no: 7, name: "Karbon Dioksida", rumus: "CO2", value: formData.co2 },
  ];

  return (
    // CONTAINER UTAMA DIPERLEBAR (max-w-7xl)
    <div className="max-w-7xl mx-auto space-y-8 pb-20 font-sans px-4 sm:px-6 lg:px-8">
      {/* HEADER PAGE */}
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
            Input Data Cerdas & Otomatis • Standar: IEEE C57.104-2019
          </p>
        </div>
      </div>

      {/* FORM INPUT SECTION (Dibatasi max-w-5xl agar input tidak terlalu lebar) */}
      <div className="max-w-5xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* I. Identitas */}
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
                <select
                  name="lokasi_gi"
                  value={formData.lokasi_gi}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">-- Pilih GI --</option>
                  {allGIs
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((gi, idx) => (
                      <option key={idx} value={gi.name}>
                        {gi.name}
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
                  <option value="">-- Pilih Trafo --</option>
                  {formData.lokasi_gi && trafoDatabase[formData.lokasi_gi] ? (
                    trafoDatabase[formData.lokasi_gi].map((t, idx) => (
                      <option key={idx} value={t.name}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>Data Kosong</option>
                  )}
                </select>
              </div>
              {/* Read Only Fields */}
              <div>
                <label className={labelClass}>Merk</label>
                <input
                  type="text"
                  value={formData.merk_trafo}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
              <div>
                <label className={labelClass}>S/N</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tahun</label>
                <input
                  type="text"
                  value={formData.tahun_pembuatan}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
              <div>
                <label className={labelClass}>Volt</label>
                <input
                  type="text"
                  value={formData.level_tegangan}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
            </div>
          </div>

          {/* II & III. Sampling & Gas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cardClass}>
              <div className="flex items-center gap-3 mb-4 text-orange-500 font-bold border-b pb-2">
                <Thermometer size={18} /> II. Data Sampling
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Tanggal</label>
                  <input
                    type="date"
                    name="tanggal_sampling"
                    value={formData.tanggal_sampling}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Suhu (°C)</label>
                    <input
                      type="number"
                      name="suhu_sampel"
                      value={formData.suhu_sampel}
                      onChange={handleChange}
                      className={inputClass}
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
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={cardClass}>
              <div className="flex items-center gap-3 mb-4 text-green-500 font-bold border-b pb-2">
                <FlaskConical size={18} /> III. Konsentrasi Gas (ppm)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map(
                  (gas) => (
                    <div key={gas}>
                      <label className="block text-center text-[10px] font-bold uppercase mb-1">
                        {gas}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        name={gas}
                        value={formData[gas]}
                        onChange={handleChange}
                        className={`${inputClass} text-center font-mono`}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              "Memproses..."
            ) : (
              <>
                <Activity /> ANALISA SEKARANG
              </>
            )}
          </button>
        </form>
      </div>

      {/* --- RESULT SECTION (FULL WIDTH & SPACIOUS) --- */}
      {result && (
        <div
          className={`mt-16 pt-10 border-t-4 border-dashed ${
            isDarkMode ? "border-slate-700" : "border-gray-300"
          }`}
        >
          {/* Header Laporan */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 px-2">
            <div>
              <h2
                className={`text-3xl font-extrabold uppercase tracking-tight ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Laporan Hasil Analisis
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Metode: IEEE C57.104, Rogers Ratio & Duval Triangle
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="mt-4 md:mt-0 flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-lg font-medium"
            >
              <FileText size={18} /> Cetak PDF
            </button>
          </div>

          {/* MAIN REPORT CARD - FULL WIDTH */}
          <div
            className={`p-1 rounded-3xl border shadow-2xl overflow-hidden w-full ${
              isDarkMode
                ? "bg-slate-800 border-slate-600"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="p-6 lg:p-10 space-y-10">
              {/* 1. STATUS BANNER (FULL WIDTH) */}
              <div
                className={`flex flex-col md:flex-row items-center justify-between p-8 rounded-2xl border-l-[12px] shadow-sm ${
                  result.ieee_status.includes("Normal")
                    ? "bg-green-50 border-green-500 text-green-900"
                    : result.ieee_status.includes("KRITIS")
                    ? "bg-red-50 border-red-500 text-red-900"
                    : "bg-amber-50 border-amber-500 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-6">
                  {result.ieee_status.includes("Normal") ? (
                    <CheckCircle size={56} strokeWidth={2.5} />
                  ) : (
                    <AlertTriangle size={56} strokeWidth={2.5} />
                  )}
                  <div>
                    <h4 className="text-sm font-bold uppercase opacity-70 tracking-widest mb-1">
                      Status Kondisi (IEEE C57.104)
                    </h4>
                    <h3 className="text-4xl font-extrabold tracking-tight">
                      {result.ieee_status}
                    </h3>
                  </div>
                </div>
                <div className="mt-6 md:mt-0 text-center md:text-right bg-white/60 backdrop-blur-sm px-8 py-4 rounded-xl border border-white/50">
                  <div className="text-xs font-bold uppercase opacity-60 mb-1">
                    Total Gas Terlarut (TDCG)
                  </div>
                  <div className="text-4xl font-mono font-bold tracking-tight">
                    {result.tdcg_value?.toFixed(0)}{" "}
                    <span className="text-lg font-sans font-medium text-opacity-70">
                      ppm
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. MAIN GRID (TABLE & CHARTS) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* KOLOM KIRI: DATA TABLE (Span 4) */}
                <div className="xl:col-span-4 flex flex-col h-full">
                  <div
                    className={`flex-1 border rounded-2xl overflow-hidden shadow-sm ${
                      isDarkMode ? "border-slate-600" : "border-gray-300"
                    }`}
                  >
                    <div className="bg-gray-100 p-4 border-b border-gray-300 font-bold text-center text-sm text-gray-700 tracking-wider">
                      DATA KONSENTRASI GAS
                    </div>
                    <table className="w-full text-sm">
                      <tbody
                        className={`divide-y ${
                          isDarkMode
                            ? "divide-slate-700 text-gray-300"
                            : "divide-gray-200 text-gray-700"
                        }`}
                      >
                        {gasTableData.map((r) => (
                          <tr
                            key={r.no}
                            className={
                              isDarkMode
                                ? "hover:bg-slate-700 transition-colors"
                                : "hover:bg-gray-50 transition-colors"
                            }
                          >
                            <td className="px-5 py-4 font-medium">{r.name}</td>
                            <td className="px-5 py-4 text-right font-mono font-bold text-base">
                              {r.value}
                            </td>
                            <td className="px-2 py-4 text-xs text-gray-400">
                              ppm
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KOLOM KANAN: VISUALISASI (Span 8 - Area Luas) */}
                <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CARD 1: DUVAL PENTAGON */}
                  <div
                    className={`p-6 rounded-2xl border flex flex-col items-center justify-center min-h-[380px] shadow-sm ${
                      isDarkMode
                        ? "bg-slate-700/30 border-slate-600"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <h5 className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest text-center">
                      Duval Pentagon
                    </h5>
                    {/* Scale diperbesar sedikit agar lebih jelas di area luas */}
                    <div className="transform scale-110">
                      <DuvalPentagon
                        h2={formData.h2}
                        ch4={formData.ch4}
                        c2h6={formData.c2h6}
                        c2h4={formData.c2h4}
                        c2h2={formData.c2h2}
                      />
                    </div>
                  </div>

                  {/* CARD 2: DUVAL TRIANGLE */}
                  <div
                    className={`p-6 rounded-2xl border flex flex-col items-center justify-between min-h-[380px] shadow-sm ${
                      isDarkMode
                        ? "bg-slate-700/30 border-slate-600"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <h5 className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest text-center">
                      Duval Triangle 1
                    </h5>
                    {result.duval_data ? (
                      <div className="flex flex-col items-center w-full h-full justify-between">
                        <div className="transform scale-110 mb-4">
                          <DuvalTriangle
                            ch4={result.duval_data.ch4}
                            c2h4={result.duval_data.c2h4}
                            c2h2={result.duval_data.c2h2}
                          />
                        </div>
                        <div className="w-full text-center mt-4">
                          <span
                            className={`inline-block px-4 py-2 rounded-lg text-sm font-bold border shadow-sm ${
                              isDarkMode
                                ? "bg-slate-800 border-slate-600 text-cyan-400"
                                : "bg-white border-gray-200 text-cyan-700"
                            }`}
                          >
                            {result.duval_diagnosis}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-sm text-gray-400 italic">
                        Data Triangle Tidak Tersedia
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. FOOTER: DIAGNOSA DETAIL & AI */}
              <div className="border-t pt-10 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border shadow-md">
                {/* KIRI: TEKNIS */}
                <div
                  className={`p-8 ${
                    isDarkMode
                      ? "bg-slate-700 text-gray-200"
                      : "bg-gray-50 text-gray-800"
                  }`}
                >
                  <h5 className="font-bold text-xs uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2">
                    <Activity size={16} /> Rincian Diagnosa Teknis
                  </h5>
                  <ul className="space-y-4 text-sm">
                    <li className="flex justify-between items-center border-b pb-3 border-gray-200/10">
                      <span className="opacity-80">Rogers Ratio Diagnosis</span>
                      <span className="font-bold text-base">
                        {result.rogers_diagnosis}
                      </span>
                    </li>
                    <li className="flex justify-between items-center border-b pb-3 border-gray-200/10">
                      <span className="opacity-80">Key Gas Dominan</span>
                      <span className="font-bold text-base text-blue-500">
                        {result.key_gas}
                      </span>
                    </li>
                    <li className="flex justify-between items-center border-b pb-3 border-gray-200/10">
                      <span className="opacity-80">
                        Kesehatan Kertas (Solid Insulation)
                      </span>
                      <span
                        className={`font-bold text-base ${
                          result.paper_health?.status.includes("Fault")
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {result.paper_health
                          ? result.paper_health.status
                          : "N/A"}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* KANAN: AI */}
                <div
                  className={`p-8 ${
                    isDarkMode
                      ? "bg-slate-800 text-gray-300"
                      : "bg-white text-gray-700"
                  }`}
                >
                  <h5 className="font-bold text-xs uppercase tracking-widest text-blue-500 mb-6 flex items-center gap-2">
                    🤖 Analisis Cerdas (Volty AI)
                  </h5>
                  <div className="text-sm leading-relaxed text-justify whitespace-pre-wrap font-medium opacity-90">
                    {result.volty_chat}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputFormPage;
