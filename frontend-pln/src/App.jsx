import { useState, useEffect } from "react";
import {
  Activity,
  Zap,
  BarChart3,
  Search,
  BookOpen,
  LayoutDashboard,
  History,
  RefreshCcw,
} from "lucide-react";

// Import tombol tema (Path Relatif yang Benar)
import ThemeToggle from "C:/Users/Jerem/OneDrive/Documents/Project PLN/frontend-pln/components/Themetoggle.jsx";

function App() {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [formData, setFormData] = useState({
    h2: 0,
    ch4: 0,
    c2h2: 0,
    c2h4: 0,
    c2h6: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- FUNGSI ---
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: parseFloat(e.target.value) || 0,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setResult(data);
      if (activePage === "history") fetchHistory();
    } catch (error) {
      alert(
        "❌ Gagal terhubung ke Server Python! Pastikan backend sudah jalan."
      );
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/history");
      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error("Gagal ambil history:", error);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (activePage === "history") fetchHistory();
  }, [activePage]);

  // Helper Warna Status
  const getStatusColor = (status) => {
    if (!status) return "text-slate-500";
    if (status.includes("Normal") || status.includes("Aman"))
      return "text-emerald-500 border-emerald-500/50 bg-emerald-500/10";
    if (status.includes("Bahaya") || status.includes("Arcing"))
      return "text-rose-500 border-rose-500/50 bg-rose-500/10";
    return "text-amber-500 border-amber-500/50 bg-amber-500/10";
  };

  // Warna Grafik
  const chartColors = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#a855f7"];

  // --- TAMPILAN (JSX) ---
  return (
    <div
      className={`flex min-h-screen font-sans transition-colors duration-500 ${
        isDarkMode
          ? "bg-[#0f172a] text-slate-200"
          : "bg-slate-50 text-slate-800"
      }`}
    >
      {/* === SIDEBAR KIRI === */}
      <aside
        className={`w-72 fixed h-full border-r p-5 flex flex-col z-20 shadow-2xl transition-colors duration-500 ${
          isDarkMode
            ? "bg-[#1e293b]/90 border-slate-700/50"
            : "bg-white/90 border-slate-200"
        } backdrop-blur-xl`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-3 mb-8 pb-6 border-b transition-colors ${
            isDarkMode ? "border-slate-700/50" : "border-slate-200"
          }`}
        >
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shadow-lg">
            <Zap className="text-black fill-black" size={24} />
          </div>
          <div>
            <h1
              className={`text-lg font-bold tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              PLN <span className="text-yellow-500">SMART</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              UPT Manado
            </p>
          </div>
        </div>

        {/* Toggle Theme */}
        <div className="flex items-center justify-between bg-opacity-20 p-3 rounded-lg mb-6 border border-transparent hover:border-slate-500/30 transition-all">
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">
            Mode Tampilan
          </span>
          <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        </div>

        {/* Menu Navigasi */}
        <div className="space-y-2 mb-8">
          {[
            {
              id: "dashboard",
              label: "Dashboard AI",
              icon: <LayoutDashboard size={18} />,
            },
            {
              id: "history",
              label: "Riwayat Data",
              icon: <History size={18} />,
            },
            {
              id: "guide",
              label: "Panduan & Info",
              icon: <BookOpen size={18} />,
            },
          ].map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActivePage(menu.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all 
                ${
                  activePage === menu.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : isDarkMode
                    ? "text-slate-400 hover:bg-slate-800"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
            >
              {menu.icon} {menu.label}
            </button>
          ))}
        </div>

        {/* Form Input (Hanya muncul di Dashboard) */}
        {activePage === "dashboard" && (
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">
              <Activity size={14} /> Parameter DGA
            </div>
            {["h2", "ch4", "c2h2", "c2h4", "c2h6"].map((key) => (
              <div key={key} className="group">
                <label className="text-xs text-slate-400 mb-1 uppercase font-bold block">
                  {key}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name={key}
                    value={formData[key] || ""}
                    onChange={handleChange}
                    placeholder="0"
                    className={`w-full border text-sm rounded-lg p-2.5 pl-3 focus:ring-1 focus:ring-blue-500 outline-none transition-all 
                        ${
                          isDarkMode
                            ? "bg-slate-950 border-slate-700 text-white shadow-inner"
                            : "bg-slate-50 border-slate-300 text-slate-900 shadow-sm"
                        }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
                    ppm
                  </span>
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search size={18} />
              )}
              <span>Analisis</span>
            </button>
          </div>
        )}
      </aside>

      {/* === KONTEN KANAN === */}
      <main className="flex-1 ml-72 p-8 lg:p-12 transition-all">
        {/* --- HALAMAN DASHBOARD --- */}
        {activePage === "dashboard" && (
          <div className="animate-in fade-in duration-500">
            <header className="mb-8">
              <h2
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-slate-800"
                }`}
              >
                Dashboard Monitoring
              </h2>
            </header>

            {result ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Hasil AI */}
                <div
                  className={`p-6 rounded-2xl border shadow-xl ${
                    isDarkMode
                      ? "bg-[#1e293b] border-slate-700"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">
                    Prediksi AI
                  </h3>
                  <p
                    className={`text-3xl font-bold ${
                      getStatusColor(result.ai_status).split(" ")[0]
                    }`}
                  >
                    {result.ai_status}
                  </p>
                </div>

                {/* Card Hasil IEEE */}
                <div
                  className={`p-6 rounded-2xl border shadow-xl ${
                    isDarkMode
                      ? "bg-[#1e293b] border-slate-700"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">
                    Standar IEEE
                  </h3>
                  <p className="text-3xl font-bold text-yellow-500">
                    {result.ieee_status}
                  </p>
                  <p className="text-sm mt-2 opacity-70">
                    Diagnosa: <b>{result.diagnosis}</b>
                  </p>
                </div>

                {/* Grafik Visualisasi */}
                <div
                  className={`col-span-1 md:col-span-2 p-6 rounded-2xl border shadow-lg ${
                    isDarkMode
                      ? "bg-[#1e293b] border-slate-700"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-500" />{" "}
                    Visualisasi Gas
                  </h3>
                  <div className="h-64 flex items-end gap-3 px-4 pb-0 border-b border-slate-500/30 relative">
                    {/* Grid Latar Belakang */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                      <div className="border-t border-slate-500 w-full"></div>
                      <div className="border-t border-slate-500 w-full"></div>
                      <div className="border-t border-slate-500 w-full"></div>
                      <div className="border-t border-slate-500 w-full"></div>
                    </div>
                    {["h2", "ch4", "c2h2", "c2h4", "c2h6"].map((key, i) => {
                      const rawHeight = (formData[key] / 500) * 100;
                      const heightPercent =
                        rawHeight > 100 ? 100 : rawHeight < 2 ? 2 : rawHeight;
                      return (
                        <div
                          key={key}
                          className="flex-1 flex flex-col items-center group h-full justify-end z-10"
                        >
                          <div
                            className={`mb-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold px-2 py-1 rounded shadow-lg -translate-y-2 ${
                              isDarkMode
                                ? "bg-slate-700 text-white"
                                : "bg-slate-800 text-white"
                            }`}
                          >
                            {formData[key]} ppm
                          </div>
                          <div
                            className="w-full max-w-[60px] rounded-t-lg transition-all duration-1000 opacity-90 group-hover:opacity-100 relative shadow-lg"
                            style={{
                              height: `${heightPercent}%`,
                              backgroundColor: chartColors[i],
                            }}
                          >
                            <div className="absolute top-0 w-full h-1 bg-white/30 rounded-t-lg"></div>
                          </div>
                          <span className="text-xs mt-3 uppercase font-bold opacity-60">
                            {key}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              isDarkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {formData[key]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[50vh] flex flex-col items-center justify-center text-center opacity-50">
                <Search size={48} className="mb-4" />
                <p>Masukkan data di sidebar untuk memulai analisis</p>
              </div>
            )}
          </div>
        )}

        {/* --- HALAMAN RIWAYAT --- */}
        {activePage === "history" && (
          <div className="animate-in slide-in-from-bottom-8 duration-500">
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h2
                  className={`text-3xl font-bold mb-2 ${
                    isDarkMode ? "text-white" : "text-slate-800"
                  }`}
                >
                  Riwayat Analisis
                </h2>
                <p className="opacity-70">
                  Data historis pengujian yang tersimpan di Database SQLite.
                </p>
              </div>
              <button
                onClick={fetchHistory}
                className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors"
              >
                <RefreshCcw
                  className={loadingHistory ? "animate-spin" : ""}
                  size={20}
                />
              </button>
            </header>
            <div
              className={`rounded-xl border overflow-hidden ${
                isDarkMode
                  ? "bg-[#1e293b] border-slate-700"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead
                    className={`text-xs uppercase ${
                      isDarkMode
                        ? "bg-slate-900 text-slate-400"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <tr>
                      <th className="px-6 py-4">Waktu</th>
                      <th className="px-6 py-4 text-center">H2</th>
                      <th className="px-6 py-4 text-center">CH4</th>
                      <th className="px-6 py-4 text-center">C2H2</th>
                      <th className="px-6 py-4">Status AI</th>
                      <th className="px-6 py-4">Diagnosa IEEE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-opacity-10 divide-slate-500">
                    {historyData.length > 0 ? (
                      historyData.map((row, index) => (
                        <tr
                          key={index}
                          className={`hover:bg-opacity-50 ${
                            isDarkMode
                              ? "hover:bg-slate-800"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-6 py-4 font-medium opacity-80">
                            {row.tanggal || row[1]}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {row.h2 || row[2]}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {row.ch4 || row[3]}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-red-500">
                            {row.c2h2 || row[4]}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                (row.hasil_ai || row[7]).includes("Normal")
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {row.hasil_ai || row[7]}
                            </span>
                          </td>
                          <td className="px-6 py-4 opacity-70">
                            {row.diagnosa || row[9]}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-6 py-8 text-center opacity-50"
                        >
                          Belum ada data riwayat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- HALAMAN PANDUAN (YANG DULUNYA HILANG) --- */}
        {activePage === "guide" && (
          <div className="animate-in slide-in-from-right-8 duration-500 max-w-4xl">
            <header className="mb-8 border-b border-slate-700 pb-6">
              <h2
                className={`text-3xl font-bold mb-2 flex items-center gap-3 ${
                  isDarkMode ? "text-white" : "text-slate-800"
                }`}
              >
                <BookOpen className="text-blue-500" size={32} /> Panduan
                Penggunaan
              </h2>
            </header>

            <div className="space-y-8">
              {/* Cara Kerja */}
              <div
                className={`p-6 rounded-2xl border ${
                  isDarkMode
                    ? "bg-[#1e293b] border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <h3 className="text-xl font-bold mb-4 border-l-4 border-blue-500 pl-3">
                  Cara Kerja
                </h3>
                <ol className="list-decimal list-inside space-y-3 opacity-80 ml-2">
                  <li>
                    Buka menu <strong>Dashboard AI</strong>.
                  </li>
                  <li>Isi parameter gas dari hasil lab.</li>
                  <li>
                    Klik tombol <strong>Analisis</strong>.
                  </li>
                  <li>
                    Sistem akan memproses data menggunakan Machine Learning.
                  </li>
                  <li>
                    Data otomatis tersimpan di menu <strong>Riwayat</strong>.
                  </li>
                </ol>
              </div>

              {/* Tabel IEEE LENGKAP */}
              <div
                className={`p-6 rounded-2xl border ${
                  isDarkMode
                    ? "bg-[#1e293b] border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <h3 className="text-xl font-bold mb-4 border-l-4 border-yellow-500 pl-3">
                  Standar IEEE C57.104
                </h3>
                <div className="overflow-x-auto rounded-lg border border-opacity-20 border-slate-500">
                  <table className="w-full text-sm text-left opacity-90">
                    <thead
                      className={`text-xs uppercase ${
                        isDarkMode
                          ? "bg-slate-900 text-slate-400"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <tr>
                        <th className="px-6 py-3">Gas</th>
                        <th className="px-6 py-3">Batas Aman</th>
                        <th className="px-6 py-3">Indikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-opacity-20 divide-slate-500">
                      <tr>
                        <td className="px-6 py-3">H2</td>
                        <td className="px-6 py-3 text-green-500">&lt; 100</td>
                        <td className="px-6 py-3">Partial Discharge</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3">CH4</td>
                        <td className="px-6 py-3 text-green-500">&lt; 120</td>
                        <td className="px-6 py-3">Overheating</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3">C2H2</td>
                        <td className="px-6 py-3 text-green-500">&lt; 1</td>
                        <td className="px-6 py-3 text-red-500 font-bold">
                          Arcing (Bahaya)
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3">C2H4</td>
                        <td className="px-6 py-3 text-green-500">&lt; 50</td>
                        <td className="px-6 py-3">Thermal Fault</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
