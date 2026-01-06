import React from "react";
import {
  FileText,
  Thermometer,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import DuvalPentagon from "./DuvalPentagon";

const DashboardPage = ({
  formData,
  handleChange,
  handleSubmit,
  result,
  isDarkMode,
  isLoading,
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

  // Data Gas untuk Tabel Laporan
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* --- HEADER --- */}
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
        <div className="flex gap-2 no-print">
          <div className="px-4 py-2 bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700] rounded-lg text-sm font-bold">
            Metode: 90th Percentile
          </div>
        </div>
      </div>

      {/* --- FORM INPUT --- */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* I. IDENTITAS */}
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
                className={inputClass}
                placeholder="Contoh: GI Teling"
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
                className={inputClass}
                placeholder="Contoh: IBT-1"
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
              <label className={labelClass}>Serial Number</label>
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
                <label className={labelClass}>Tegangan (kV)</label>
                <input
                  type="text"
                  name="level_tegangan"
                  value={formData.level_tegangan}
                  onChange={handleChange}
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

        {/* II. DATA SAMPLING */}
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

        {/* III. INPUT GAS */}
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

        {/* TOMBOL ANALISA */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 font-bold text-lg rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
            isLoading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#FFD700] hover:bg-[#e6c200] text-black hover:scale-[1.01]"
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-gray-600"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              SEDANG MENGANALISIS...
            </>
          ) : (
            <>
              {" "}
              <Activity size={24} /> ANALISA KONDISI TRAFO SEKARANG{" "}
            </>
          )}
        </button>
      </form>

      {/* --- TOMBOL CETAK --- */}
      {result && (
        <div className="flex justify-end mt-8 mb-4 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FileText size={18} /> Simpan sebagai PDF / Cetak Laporan
          </button>
        </div>
      )}

      {/* --- HASIL ANALISIS (REPORT MODE) --- */}
      {result && (
        <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-10`}>
          {/* KOP LAPORAN */}
          <div
            className={`p-8 rounded-2xl border-2 ${
              isDarkMode
                ? "bg-slate-800 border-slate-600"
                : "bg-white border-gray-300"
            }`}
          >
            <div className="text-center mb-8 pb-6 border-b border-gray-300">
              <h2
                className={`text-xl font-bold uppercase tracking-wide ${
                  isDarkMode ? "text-white" : "text-black"
                }`}
              >
                Laporan Analisis DGA (Dissolved Gas Analysis)
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Metode Analisis: IEEE C57.104-2019 & Duval Pentagon
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* --- BAGIAN KIRI: TABEL DATA --- */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">
                  Tabel V: Data Uji Konsentrasi Gas
                </h4>
                <div className="overflow-hidden border border-black rounded-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-black font-bold uppercase border-b border-black">
                      <tr>
                        <th className="px-4 py-2 border-r border-black w-12 text-center">
                          No
                        </th>
                        <th className="px-4 py-2 border-r border-black">
                          Combustible Gas
                        </th>
                        <th className="px-4 py-2 text-center">
                          Konsentrasi (ppm)
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y divide-black ${
                        isDarkMode ? "text-gray-200" : "text-black"
                      }`}
                    >
                      {gasTableData.map((row) => (
                        <tr key={row.no} className="hover:bg-gray-50/10">
                          <td className="px-4 py-2 border-r border-black text-center font-medium">
                            {row.no}
                          </td>
                          <td className="px-4 py-2 border-r border-black">
                            {row.name}{" "}
                            <span className="text-xs text-gray-500 ml-1">
                              ({row.rumus})
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-bold font-mono">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold border-t-2 border-black text-black">
                        <td className="px-4 py-2 border-r border-black text-center">
                          -
                        </td>
                        <td className="px-4 py-2 border-r border-black uppercase">
                          Total Combustible Gas (TDCG)
                        </td>
                        <td className="px-4 py-2 text-center text-lg">
                          {result.tdcg_value.toFixed(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- BAGIAN KANAN: STATUS & VISUALISASI --- */}
              <div className="space-y-6">
                {/* STATUS BOX */}
                <div
                  className={`p-6 border-l-8 rounded-r-lg shadow-sm ${
                    result.ieee_status.includes("Normal")
                      ? "bg-green-50 border-green-500 text-green-900"
                      : result.ieee_status.includes("KRITIS")
                      ? "bg-red-50 border-red-500 text-red-900"
                      : "bg-orange-50 border-orange-500 text-orange-900"
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase opacity-60 mb-1">
                    Status Kondisi (IEEE C57.104)
                  </h4>
                  <div className="text-3xl font-extrabold flex items-center gap-3">
                    {result.ieee_status.includes("Normal") ? (
                      <CheckCircle size={32} />
                    ) : (
                      <AlertTriangle size={32} />
                    )}
                    {result.ieee_status}
                  </div>
                </div>

                {/* --- VISUALISASI PENTAGON (CLEAN VERSION) --- */}
                {/* Kita hapus semua border dan judul ganda disini */}
                <div className="flex flex-col items-center justify-center pt-4">
                  {/* Render Komponen Saja (Dia sudah punya card & judul sendiri) */}
                  <div className="w-full max-w-[320px] transform scale-100 hover:scale-105 transition-transform">
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

            {/* --- DIAGNOSA NARATIF --- */}
            <div className="mt-8 border-t border-gray-300 pt-6">
              <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">
                Hasil Analisis & Rekomendasi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black rounded-sm overflow-hidden">
                <div className="p-4 border-b md:border-b-0 md:border-r border-black bg-gray-50">
                  <h5 className="font-bold text-xs uppercase text-gray-600 mb-2">
                    Diagnosa Teknis
                  </h5>
                  <ul className="list-disc list-inside text-sm space-y-1 text-black font-medium">
                    <li>
                      <strong>Rogers Ratio:</strong> {result.rogers_diagnosis}
                    </li>
                    <li>
                      <strong>Key Gas:</strong> {result.key_gas}
                    </li>
                    <li>
                      <strong>Detail IEEE:</strong>{" "}
                      {result.diagnosis || result.diagnosa}
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-white">
                  <h5 className="font-bold text-xs uppercase text-blue-600 mb-2 flex items-center gap-2">
                    <Activity size={14} /> Rekomendasi Volty AI
                  </h5>
                  <p className="text-sm text-justify leading-relaxed text-gray-800">
                    "{result.volty_chat}"
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 flex justify-between text-[10px] text-gray-400 uppercase">
              <span>Dicetak oleh: Volty AI System</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
