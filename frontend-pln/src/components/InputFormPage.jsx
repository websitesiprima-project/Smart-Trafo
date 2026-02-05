import React, { useEffect, useState } from "react";
import {
  FileText,
  Thermometer,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import DuvalPentagon from "./DuvalPentagon";
import { supabase } from "../lib/supabaseClient";

const InputFormPage = ({
  formData,
  handleChange,
  setFormData,
  handleSubmit,
  result,
  isDarkMode,
  isLoading,
  userRole,
  userUnit,
  unitMapping = {},
}) => {
  const [dynamicGIs, setDynamicGIs] = useState([]);
  const [dynamicTrafos, setDynamicTrafos] = useState([]);

  const isSuperAdmin = userRole === "super_admin";

  // --- 1. LOGIKA PENCARIAN GI (DIPERBAIKI LAGI) ---
  useEffect(() => {
    let availableGIs = [];

    // Debugging: Cek data yang masuk
    console.log("🛠️ Input Form Debug:");
    console.log(" - User Unit:", userUnit);
    console.log(" - Mapping Keys:", Object.keys(unitMapping));

    if (!unitMapping || Object.keys(unitMapping).length === 0) return;

    if (isSuperAdmin) {
      // Super Admin: Ambil Semua
      Object.values(unitMapping).forEach((giList) => {
        if (Array.isArray(giList)) {
          // Support format baru (objek) atau lama (string)
          giList.forEach((gi) => {
            const name = typeof gi === "string" ? gi : gi.name;
            if (name) availableGIs.push(name);
          });
        }
      });
    } else {
      // Admin Unit: Cari yang cocok (Sangat Longgar)
      const targetUnit = (userUnit || "")
        .toLowerCase()
        .replace(/ultg/g, "")
        .trim(); // Hapus 'ultg', trim spasi

      const foundKey = Object.keys(unitMapping).find((key) => {
        const cleanKey = key.toLowerCase().replace(/ultg/g, "").trim();
        // Cek apakah target ada di key, atau key ada di target
        return cleanKey.includes(targetUnit) || targetUnit.includes(cleanKey);
      });

      console.log(` - Target Bersih: "${targetUnit}"`);
      console.log(` - Key Ketemu: "${foundKey}"`);

      const unitGis = foundKey ? unitMapping[foundKey] : [];

      if (Array.isArray(unitGis)) {
        availableGIs = unitGis.map((gi) =>
          typeof gi === "string" ? gi : gi.name,
        );
      }
    }

    setDynamicGIs(availableGIs.sort());
  }, [unitMapping, userRole, userUnit, isSuperAdmin]);

  // --- 2. FETCH TRAFOS (TETAP SAMA) ---
  useEffect(() => {
    const fetchTrafos = async () => {
      if (formData.lokasi_gi) {
        const { data } = await supabase
          .from("assets_trafo")
          .select("*")
          .eq("lokasi_gi", formData.lokasi_gi);

        if (data) setDynamicTrafos(data);
      } else {
        setDynamicTrafos([]);
      }
    };
    fetchTrafos();
  }, [formData.lokasi_gi]);

  // --- 3. AUTOFILL (TETAP SAMA) ---
  useEffect(() => {
    if (typeof setFormData !== "function") return;
    if (formData.lokasi_gi && formData.nama_trafo) {
      const selectedTrafo = dynamicTrafos.find(
        (t) => t.nama_trafo === formData.nama_trafo,
      );
      if (selectedTrafo) {
        setFormData((prev) => ({
          ...prev,
          merk_trafo: selectedTrafo.merk || "",
          serial_number: selectedTrafo.serial_number || "",
          tahun_pembuatan: selectedTrafo.tahun_pembuatan || "",
          level_tegangan: selectedTrafo.level_tegangan || "",
        }));
      }
    }
  }, [formData.lokasi_gi, formData.nama_trafo, dynamicTrafos, setFormData]);

  const sortTrafos = (trafos) => {
    return [...trafos].sort((a, b) => {
      const aName = a.nama_trafo || "";
      const bName = b.nama_trafo || "";
      const aMatch = aName.match(/^([A-Z]+)\s*#?(\d+)$/i);
      const bMatch = bName.match(/^([A-Z]+)\s*#?(\d+)$/i);
      if (!aMatch || !bMatch) return aName.localeCompare(bName);
      return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
    });
  };

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

  const gasTableData = [
    { name: "Karbon Monoksida", rumus: "CO", value: formData.co },
    { name: "Karbon Dioksida", rumus: "CO2", value: formData.co2 },
    { name: "Hidrogen", rumus: "H2", value: formData.h2 },
    { name: "Metana", rumus: "CH4", value: formData.ch4 },
    { name: "Etana", rumus: "C2H6", value: formData.c2h6 },
    { name: "Etilen", rumus: "C2H4", value: formData.c2h4 },
    { name: "Asetilen", rumus: "C2H2", value: formData.c2h2 },
  ];

  return (
    <div
      className={`min-h-screen pb-20 ${theme.bg} transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2
              className={`text-2xl md:text-3xl font-extrabold ${isDarkMode ? "text-white" : "text-[#1B7A8F]"}`}
            >
              Formulir Uji DGA
            </h2>
            <p className={`text-sm mt-1 ${theme.subText}`}>
              IEEE C57.104-2019 & IEC 60599 Standard Assessment
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <div className={`lg:col-span-7 rounded-2xl p-6 border ${theme.card}`}>
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
                      {dynamicGIs.length === 0 ? (
                        <option disabled>Tidak ada GI ditemukan</option>
                      ) : (
                        dynamicGIs.map((giName, idx) => (
                          <option key={idx} value={giName}>
                            {giName}
                          </option>
                        ))
                      )}
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
                      {dynamicTrafos.length === 0 && (
                        <option disabled>Belum ada aset terdaftar</option>
                      )}
                      {sortTrafos(dynamicTrafos).map((t, idx) => (
                        <option key={idx} value={t.nama_trafo}>
                          {t.nama_trafo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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

          <div className={`lg:col-span-5 flex flex-col h-full`}>
            <div className={`flex-1 rounded-2xl p-6 border mb-4 ${theme.card}`}>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed border-gray-500/30">
                <FlaskConical className="text-green-500" size={18} />
                <h3 className={`font-bold text-base uppercase ${theme.text}`}>
                  Konsentrasi Gas (ppm)
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {["co", "co2", "h2", "ch4", "c2h6", "c2h4", "c2h2"].map(
                  (gas) => (
                    <div key={gas} className="relative">
                      <label
                        className={`absolute left-3 top-2.5 text-xs font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {gas}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        name={gas}
                        value={formData[gas] === 0 ? "" : formData[gas]}
                        onChange={handleChange}
                        className={`w-full pl-14 pr-4 py-2.5 rounded-lg border text-right font-mono text-lg font-bold outline-none focus:ring-1 focus:ring-green-500 transition-all ${isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        placeholder="0"
                      />
                    </div>
                  ),
                )}
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

        {result && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 space-y-6">
            <div
              className={`rounded-xl border p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md relative overflow-hidden ${result.ieee_status.includes("Normal") ? "bg-emerald-50 border-emerald-200" : result.ieee_status.includes("KRITIS") ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}
            >
              <div className="flex items-center gap-4 z-10">
                <div
                  className={`p-3 rounded-full ${result.ieee_status.includes("Normal") ? "bg-emerald-100 text-emerald-600" : result.ieee_status.includes("KRITIS") ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}
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
                    className={`text-2xl font-black tracking-tight ${result.ieee_status.includes("Normal") ? "text-emerald-800" : result.ieee_status.includes("KRITIS") ? "text-rose-800" : "text-amber-800"}`}
                  >
                    {result.ieee_status}
                  </h3>
                </div>
              </div>
              <div className="text-right z-10">
                <p className="text-[10px] font-bold uppercase text-gray-500">
                  TDCG Level
                </p>
                <p className="text-2xl font-mono font-bold text-gray-800">
                  {result.tdcg_value?.toFixed(0)}{" "}
                  <span className="text-sm font-sans text-gray-500">ppm</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
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
                    <br />
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-2xl border p-6 space-y-6 ${theme.card}`}>
                <div className="flex items-center gap-2 pb-2 border-b border-gray-500/20">
                  <Activity className="text-blue-500" size={20} />
                  <h4 className={`font-bold text-lg ${theme.text}`}>
                    Diagnosis Teknis
                  </h4>
                </div>
                <div className="space-y-4">
                  <div
                    className={`p-3 rounded-lg border-l-4 ${isDarkMode ? "bg-slate-900 border-purple-500" : "bg-purple-50 border-purple-500"}`}
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
                      className={`p-3 rounded-lg border ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        Key Gas Dominan
                      </p>
                      <p className={`font-bold ${theme.text}`}>
                        {result.key_gas}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-lg border ${result.paper_health?.status.includes("Fault") ? "bg-red-50 border-red-200" : isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"}`}
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        Isolasi Kertas (CO2/CO)
                      </p>
                      <p
                        className={`font-bold ${result.paper_health?.status.includes("Fault") ? "text-red-600" : theme.text}`}
                      >
                        {result.paper_health ? result.paper_health.status : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={`rounded-2xl border p-6 relative overflow-hidden ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-sm"}`}
              >
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
                  className={`prose prose-sm max-w-none font-medium leading-relaxed whitespace-pre-line ${isDarkMode ? "prose-invert text-gray-300" : "text-gray-700"}`}
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
