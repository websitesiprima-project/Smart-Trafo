import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Info,
  FileText,
  Activity,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  GitMerge, // Icon untuk Rogers (Rasio)
} from "lucide-react";

const GuidePage = ({ isDarkMode, initialTab = "ieee" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update tab when navigated from another page
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // --- DATA 1: Limit IEEE C57.104 ---
  const ieeeLimits = [
    {
      gas: "Hidrogen (H2)",
      limit: "100 ppm",
      desc: "Partial Discharge / Stray Gassing",
    },
    { gas: "Metana (CH4)", limit: "120 ppm", desc: "Overheating Minyak" },
    {
      gas: "Asetilen (C2H2)",
      limit: "1 ppm",
      desc: "Arcing (Busur Api) - SANGAT KRITIS",
    },
    {
      gas: "Etilen (C2H4)",
      limit: "50 ppm",
      desc: "Overheating Suhu Tinggi (>700°C)",
    },
    { gas: "Etana (C2H6)", limit: "65 ppm", desc: "Overheating Suhu Menengah" },
    {
      gas: "Karbon Monoksida (CO)",
      limit: "350 ppm",
      desc: "Degradasi Kertas Isolasi",
    },
    {
      gas: "Karbon Dioksida (CO2)",
      limit: "2500 ppm",
      desc: "Penuaan Kertas / Oksidasi",
    },
  ];

  // --- DATA 2: Rogers Ratio ---
  const rogersData = [
    {
      case: "0",
      r2: "< 0.1",
      r1: "0.1 - 1.0",
      r5: "< 1.0",
      diag: "Normal",
      color: "text-emerald-500",
    },
    {
      case: "1",
      r2: "< 0.1",
      r1: "< 0.1",
      r5: "< 1.0",
      diag: "Partial Discharge (PD)",
      color: "text-yellow-500",
    },
    {
      case: "2",
      r2: "0.1 - 3.0",
      r1: "0.1 - 1.0",
      r5: "> 3.0",
      diag: "Arcing (Energi Tinggi)",
      color: "text-orange-500",
    },
    {
      case: "3",
      r2: "< 0.1",
      r1: "0.1 - 1.0",
      r5: "1.0 - 3.0",
      diag: "Thermal < 700°C",
      color: "text-red-500",
    },
    {
      case: "4",
      r2: "< 0.1",
      r1: "> 1.0",
      r5: "1.0 - 3.0",
      diag: "Thermal > 700°C",
      color: "text-rose-600",
    },
  ];

  // --- DATA 3: FAQ ---
  const faqs = [
    {
      q: "Apa itu DGA (Dissolved Gas Analysis)?",
      a: "DGA adalah metode analisis kondisi trafo dengan mengukur konsentrasi gas yang terlarut dalam minyak isolasi. Gas-gas ini terbentuk akibat stress termal atau elektrik.",
    },
    {
      q: "Mengapa C2H2 (Asetilen) sangat berbahaya?",
      a: "Asetilen hanya terbentuk pada suhu ekstrem (>700°C) akibat busur api listrik (Arcing). Kehadirannya, walau sedikit, menandakan adanya masalah serius yang bisa menyebabkan ledakan.",
    },
    {
      q: "Bagaimana cara kerja AI di aplikasi ini?",
      a: "Aplikasi menggunakan algoritma Random Forest yang telah dilatih dengan data historis trafo untuk mengenali pola kombinasi gas yang kompleks, melengkapi metode rasio manual.",
    },
    {
      q: "Apa itu Duval Pentagon?",
      a: "Metode visualisasi grafis untuk menentukan jenis kesalahan (Fault) berdasarkan proporsi 5 jenis gas hidrokarbon. Ini adalah standar internasional (IEC 60599).",
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <header className="mb-8 border-b border-slate-500/30 pb-6">
        <h2
          className={`text-3xl font-bold mb-2 flex items-center gap-3 ${
            isDarkMode ? "text-white" : "text-[#1B7A8F]"
          }`}
        >
          <BookOpen className="text-[#17A2B8]" size={32} /> Pusat Panduan &
          Standar
        </h2>
        <p className="opacity-70">
          Referensi teknis interpretasi DGA berdasarkan standar internasional
          dan lokal.
        </p>
      </header>

      {/* --- NAVIGASI TAB --- */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab("ieee")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap border ${
            activeTab === "ieee"
              ? "bg-[#1B7A8F] text-white border-[#1B7A8F] shadow-lg scale-105"
              : isDarkMode
                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          IEEE C57.104
        </button>

        {/* BUTTON ROGERS (BARU) */}
        <button
          onClick={() => setActiveTab("rogers")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap border ${
            activeTab === "rogers"
              ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
              : isDarkMode
                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Rogers Ratio
        </button>

        <button
          onClick={() => setActiveTab("iec")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap border ${
            activeTab === "iec"
              ? "bg-[#17A2B8] text-white border-[#17A2B8] shadow-lg scale-105"
              : isDarkMode
                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          IEC 60599 (Duval)
        </button>
        <button
          onClick={() => setActiveTab("spln")}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap border ${
            activeTab === "spln"
              ? "bg-[#FFD700] text-black border-[#FFD700] shadow-lg scale-105"
              : isDarkMode
                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          SPLN T5.004 (Lokal)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- KONTEN UTAMA (KIRI - 2/3 Layar) --- */}
        <div className="lg:col-span-2 space-y-8">
          {/* TAB CONTENT: IEEE */}
          {activeTab === "ieee" && (
            <div
              className={`p-6 rounded-2xl border animate-in fade-in zoom-in-95 duration-300 ${
                isDarkMode
                  ? "bg-[#1e293b] border-slate-700"
                  : "bg-[#FFFFFF] border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-500/30 pb-4">
                <div className="p-2 bg-[#1B7A8F]/20 rounded-lg">
                  <FileText className="text-[#1B7A8F]" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">IEEE Std C57.104™-2019</h3>
                  <p className="text-xs opacity-70">
                    Guide for the Interpretation of Gases Generated in Mineral
                    Oil-Immersed Transformers
                  </p>
                </div>
              </div>

              {/* Tabel Limit IEEE (Dynamic Data) */}
              <h4 className="font-bold text-[#17A2B8] mb-3">
                Batas Limit Gas (90th Percentile)
              </h4>
              <div className="overflow-hidden rounded-lg border border-slate-500/30">
                <table className="w-full text-sm text-left">
                  <thead
                    className={`${
                      isDarkMode ? "bg-[#0f172a]" : "bg-slate-100"
                    }`}
                  >
                    <tr>
                      <th className="px-4 py-3">Gas</th>
                      <th className="px-4 py-3">Limit (ppm)</th>
                      <th className="px-4 py-3">Indikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-opacity-10 divide-slate-500">
                    {ieeeLimits.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-opacity-50 ${
                          isDarkMode
                            ? "hover:bg-slate-800"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-[#17A2B8]">
                          {item.gas}
                        </td>
                        <td className="px-4 py-3 font-mono text-rose-500 font-bold">
                          {item.limit}
                        </td>
                        <td className="px-4 py-3 opacity-80 text-xs">
                          {item.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ROGERS RATIO (BARU) */}
          {activeTab === "rogers" && (
            <div
              className={`p-6 rounded-2xl border animate-in fade-in zoom-in-95 duration-300 ${
                isDarkMode
                  ? "bg-[#1e293b] border-slate-700"
                  : "bg-[#FFFFFF] border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-500/30 pb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <GitMerge className="text-purple-500" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Rogers Ratio Method</h3>
                  <p className="text-xs opacity-70">
                    IEC 60599 / IEEE C57.104 (Ratio Based Diagnosis)
                  </p>
                </div>
              </div>

              <p className="text-sm opacity-80 text-justify mb-6">
                Metode ini membandingkan <strong>rasio antar gas</strong> untuk
                menentukan jenis kesalahan. Efektif untuk membedakan antara
                gangguan termal (panas) dan elektris (busur api).
              </p>

              <div className="overflow-x-auto rounded-lg border border-slate-500/30">
                <table className="w-full text-sm text-left">
                  <thead
                    className={`${
                      isDarkMode ? "bg-[#0f172a]" : "bg-slate-100"
                    }`}
                  >
                    <tr>
                      <th className="px-4 py-3">Kasus</th>
                      <th className="px-4 py-3">R2 (C2H2/C2H4)</th>
                      <th className="px-4 py-3">R1 (CH4/H2)</th>
                      <th className="px-4 py-3">R5 (C2H4/C2H6)</th>
                      <th className="px-4 py-3">Diagnosis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-opacity-10 divide-slate-500">
                    {rogersData.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-opacity-50 ${
                          isDarkMode
                            ? "hover:bg-slate-800"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-center">
                          {item.case}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.r2}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.r1}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.r5}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold text-xs ${item.color}`}
                        >
                          {item.diag}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] opacity-60 mt-3 italic">
                * Jika rasio tidak sesuai dengan tabel di atas, maka diagnosis
                dianggap tidak spesifik.
              </p>
            </div>
          )}

          {/* TAB CONTENT: IEC */}
          {activeTab === "iec" && (
            <div
              className={`p-6 rounded-2xl border animate-in fade-in zoom-in-95 duration-300 ${
                isDarkMode
                  ? "bg-[#1e293b] border-slate-700"
                  : "bg-[#FFFFFF] border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-500/30 pb-4">
                <div className="p-2 bg-[#17A2B8]/20 rounded-lg">
                  <Activity className="text-[#17A2B8]" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    IEC 60599 (Duval Method){" "}
                  </h3>
                  <p className="text-xs opacity-70">
                    Guidance on the interpretation of dissolved and free gases
                    analysis
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm opacity-80 text-justify">
                  Standar ini menggunakan <strong>Rasio Gas</strong> dan
                  visualisasi grafis (Segitiga/Pentagon) untuk menentukan jenis
                  gangguan secara spesifik.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-slate-900 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <h4 className="font-bold text-[#17A2B8] mb-2">
                      Kode Diagnosa (Fault Types)
                    </h4>
                    <ul className="text-xs space-y-2 opacity-80">
                      <li>
                        <strong>PD:</strong> Partial Discharge (Peluaan Parsial)
                      </li>
                      <li>
                        <strong>D1:</strong> Discharge Low Energy (Percikan
                        kecil)
                      </li>
                      <li>
                        <strong>D2:</strong> Discharge High Energy (Arcing
                        kuat){" "}
                      </li>
                      <li>
                        <strong>T1:</strong> Thermal Fault &lt; 300°C
                      </li>
                      <li>
                        <strong>T2:</strong> Thermal Fault 300°C - 700°C
                      </li>
                      <li>
                        <strong>T3:</strong> Thermal Fault &gt; 700°C
                      </li>
                      <li>
                        <strong>S :</strong> Stray Gassing
                      </li>
                    </ul>
                  </div>
                  <div
                    className={`p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-slate-900 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <h4 className="font-bold text-[#17A2B8] mb-2">
                      Rasio Utama
                    </h4>
                    <ul className="text-xs space-y-2 opacity-80 font-mono">
                      <li>1. C2H2 / C2H4</li>
                      <li>2. CH4 / H2</li>
                      <li>3. C2H4 / C2H6</li>
                    </ul>
                    <p className="text-[10px] opacity-60 mt-3 italic">
                      *Aplikasi ini mengonversi rasio tersebut ke dalam bentuk
                      visual Duval Pentagon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: SPLN */}
          {activeTab === "spln" && (
            <div
              className={`p-6 rounded-2xl border animate-in fade-in zoom-in-95 duration-300 ${
                isDarkMode
                  ? "bg-[#1e293b] border-slate-700"
                  : "bg-[#FFFFFF] border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-500/30 pb-4">
                <div className="p-2 bg-[#FFD700]/20 rounded-lg">
                  <AlertTriangle className="text-[#FFD700]" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">SPLN T5.004-4: 2016</h3>
                  <p className="text-xs opacity-70">
                    Pedoman Pemeliharaan Trafo Tenaga (PLN)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border-l-4 border-[#FFD700] ${
                    isDarkMode ? "bg-[#FFD700]/5" : "bg-[#FFD700]/10"
                  }`}
                >
                  <p className="text-sm text-justify opacity-90">
                    PLN menggunakan metode{" "}
                    <strong>TDCG (Total Dissolved Combustible Gas)</strong>{" "}
                    untuk menentukan kondisi operasi.
                  </p>
                </div>

                <h4 className="font-bold text-[#FFD700] mb-2">
                  Klasifikasi Kondisi TDCG
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-500/30">
                  <table className="w-full text-sm text-left opacity-90">
                    <thead
                      className={`text-xs uppercase text-white ${
                        isDarkMode ? "bg-[#1B7A8F]/80" : "bg-[#1B7A8F]"
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Limit TDCG</th>
                        <th className="px-4 py-2">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/30">
                      <tr>
                        <td className="px-4 py-2 font-bold text-emerald-500">
                          Kondisi 1
                        </td>
                        <td className="px-4 py-2">&le; 720 ppm</td>
                        <td className="px-4 py-2">Operasi Normal</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-amber-500">
                          Kondisi 2
                        </td>
                        <td className="px-4 py-2">721 - 1920</td>
                        <td className="px-4 py-2">Waspada (Uji Rutin)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-orange-500">
                          Kondisi 3
                        </td>
                        <td className="px-4 py-2">1921 - 4630</td>
                        <td className="px-4 py-2">Peringatan (Uji Lanjut)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-rose-500">
                          Kondisi 4
                        </td>
                        <td className="px-4 py-2">&gt; 4630</td>
                        <td className="px-4 py-2">Bahaya (Trip)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: FAQ (Always Visible under content) */}
          <div
            className={`p-6 rounded-2xl border shadow-lg ${
              isDarkMode
                ? "bg-[#1e293b] border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2 text-[#1B7A8F]">
              <HelpCircle size={20} /> Pertanyaan Umum (FAQ)
            </h3>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  question={faq.q}
                  answer={faq.a}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          </div>
        </div>

        {/* --- SIDEBAR KANAN (Info Pendukung - 1/3 Layar) --- */}
        <div className="space-y-6">
          {/* Status Card (Legenda Warna) - STICKY */}
          <div
            className={`p-6 rounded-2xl border shadow-lg top-4 z-40 ${
              isDarkMode
                ? "bg-[#1e293b] border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2 text-[#1B7A8F]">
              <CheckCircle size={20} /> Legenda Status
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="w-3 h-3 mt-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0"></span>
                <div>
                  <strong className="text-emerald-500 block">Kondisi 1</strong>
                  <span className="opacity-70 text-xs">
                    Normal. Lanjut monitoring.
                  </span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-3 h-3 mt-1 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] flex-shrink-0"></span>
                <div>
                  <strong className="text-yellow-500 block">Kondisi 2</strong>
                  <span className="opacity-70 text-xs">
                    Waspada. Cek beban & interval uji.
                  </span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-3 h-3 mt-1 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.5)] animate-pulse flex-shrink-0"></span>
                <div>
                  <strong className="text-rose-600 block">Kondisi 3</strong>
                  <span className="opacity-70 text-xs">
                    Kritis. Indikasi kerusakan aktif.
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Kamus Gas Mini */}
          <div
            className={`p-6 rounded-2xl border shadow-lg ${
              isDarkMode
                ? "bg-[#1e293b] border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2 text-[#1B7A8F]">
              <Info size={20} /> Kamus Gas
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-2 border rounded border-slate-500/30">
                <strong className="text-[#17A2B8]">H2 (Hidrogen)</strong>
                <br />
                <span className="opacity-70">Partial Discharge / Corona.</span>
              </div>
              <div className="p-2 border rounded border-rose-500/30 bg-rose-500/5">
                <strong className="text-rose-500">C2H2 (Asetilen)</strong>
                <br />
                <span className="opacity-70">
                  Busur Api (Arcing). Paling bahaya.
                </span>
              </div>
              <div className="p-2 border rounded border-pink-500/30">
                <strong className="text-pink-500">CO (Karbon Monoksida)</strong>
                <br />
                <span className="opacity-70">Isolasi Kertas Gosong.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Komponen Kecil untuk FAQ Item
const FAQItem = ({ question, answer, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isDarkMode
          ? "border-slate-700 bg-[#0f172a]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left text-sm font-bold flex justify-between items-center hover:bg-opacity-50 transition-colors"
      >
        {question}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div
          className={`px-4 py-3 text-xs leading-relaxed border-t opacity-80 animate-in slide-in-from-top-2 ${
            isDarkMode ? "border-slate-700" : "border-slate-200"
          }`}
        >
          {answer}
        </div>
      )}
    </div>
  );
};

export default GuidePage;
