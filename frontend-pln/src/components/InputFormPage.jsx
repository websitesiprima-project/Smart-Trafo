import React, { useEffect } from "react";
import {
  FileText,
  Thermometer,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
  Save,
} from "lucide-react";
import DuvalPentagon from "./DuvalPentagon";
import { allGIs, trafoDatabase } from "../data/assetdata";

const InputFormPage = ({
  formData,
  handleChange,
  setFormData, // Pastikan ini diterima dari App.js
  handleSubmit,
  result,
  isDarkMode,
  isLoading,
}) => {
  // --- LOGIKA AUTOFILL (DENGAN PENGAMAN) ---
  useEffect(() => {
    // Cek 1: Pastikan fungsi setFormData ada
    if (typeof setFormData !== "function") {
      console.warn(
        "PERINGATAN: setFormData tidak diterima dari App.js. Fitur Autofill dimatikan."
      );
      return;
    }

    // Cek 2: Pastikan data database tersedia
    if (!trafoDatabase) {
      console.error("ERROR: trafoDatabase tidak ditemukan di assetData.js");
      return;
    }

    if (formData.lokasi_gi && formData.nama_trafo) {
      const giData = trafoDatabase[formData.lokasi_gi];

      // Cek 3: Pastikan data GI ditemukan
      if (!giData) return;

      const selectedTrafo = giData.find((t) => t.name === formData.nama_trafo);

      if (selectedTrafo) {
        console.log("Auto-filling data...", selectedTrafo);
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

  // Style helpers...
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
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
              I. Identitas Transformator (Otomatis)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Pilih GI */}
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

            {/* Pilih Trafo (Safe Render) */}
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
                    // GUNAKAN t.name AGAR TIDAK CRASH
                    <option key={idx} value={t.name}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Data Kosong</option>
                )}
              </select>
            </div>

            {/* Field Read Only */}
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
              {["h2", "ch4", "c2h2", "c2h4", "c2h6", "co", "co2"].map((gas) => (
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
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all"
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

      {/* RESULT SECTION (SAMA SEPERTI SEBELUMNYA) */}
      {result && (
        <div
          className={`mt-10 pt-10 border-t-4 border-dashed ${
            isDarkMode ? "border-slate-700" : "border-gray-300"
          }`}
        >
          <div className="flex justify-end mb-4 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg"
            >
              <FileText size={18} /> Cetak Laporan
            </button>
          </div>
          <div
            className={`p-8 rounded-2xl border-2 ${
              isDarkMode
                ? "bg-slate-800 border-slate-600"
                : "bg-white border-gray-300"
            }`}
          >
            <div className="text-center mb-8 pb-6 border-b border-gray-300">
              <h2
                className={`text-xl font-bold uppercase ${
                  isDarkMode ? "text-white" : "text-black"
                }`}
              >
                Laporan Analisis DGA
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Metode: IEEE C57.104-2019 & Duval Pentagon
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* TABLE */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">
                  Tabel V: Data Uji Konsentrasi
                </h4>
                <div className="overflow-hidden border border-black rounded-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-black font-bold uppercase border-b border-black">
                      <tr>
                        <th className="px-4 py-2 border-r border-black w-12">
                          No
                        </th>
                        <th className="px-4 py-2 border-r border-black">Gas</th>
                        <th className="px-4 py-2 text-center">ppm</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y divide-black ${
                        isDarkMode ? "text-gray-200" : "text-black"
                      }`}
                    >
                      {gasTableData.map((r) => (
                        <tr key={r.no}>
                          <td className="px-4 py-2 border-r border-black text-center">
                            {r.no}
                          </td>
                          <td className="px-4 py-2 border-r border-black">
                            {r.name} ({r.rumus})
                          </td>
                          <td className="px-4 py-2 text-center font-bold font-mono">
                            {r.value}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 text-black font-bold border-t-2 border-black">
                        <td
                          colSpan="2"
                          className="px-4 py-2 border-r border-black text-right"
                        >
                          TDCG
                        </td>
                        <td className="px-4 py-2 text-center text-lg">
                          {result.tdcg_value?.toFixed(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {/* VISUAL & STATUS */}
              <div className="space-y-6">
                <div
                  className={`p-6 border-l-8 rounded-r-lg shadow-sm ${
                    result.ieee_status.includes("Normal")
                      ? "bg-green-50 border-green-500 text-green-900"
                      : "bg-red-50 border-red-500 text-red-900"
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase opacity-60 mb-1">
                    Status IEEE C57.104
                  </h4>
                  <div className="text-3xl font-extrabold flex items-center gap-3">
                    {result.ieee_status.includes("Normal") ? (
                      <CheckCircle size={32} />
                    ) : (
                      <AlertTriangle size={32} />
                    )}{" "}
                    {result.ieee_status}
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-[300px]">
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
            {/* NARRATIVE */}
            <div className="mt-8 pt-6 border-t border-gray-300">
              <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">
                Diagnosa & Rekomendasi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black rounded-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-r border-black text-black">
                  <h5 className="font-bold text-xs uppercase text-gray-600 mb-2">
                    Diagnosa Teknis
                  </h5>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Rogers: {result.rogers_diagnosis}</li>
                    <li>Key Gas: {result.key_gas}</li>
                    <li>
                      Detail: {result.diagnosis_ieee || result.ieee_status}
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-white text-black">
                  <h5 className="font-bold text-xs uppercase text-blue-600 mb-2 flex gap-2">
                    <Activity size={14} /> Rekomendasi AI
                  </h5>
                  <p className="text-sm text-justify">"{result.volty_chat}"</p>
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
