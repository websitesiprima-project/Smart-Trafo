import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";
import VoltyMascot from "./VoltyMascot"; // Pastikan file di atas sudah dibuat

// DATABASE PENGETAHUAN LOKAL
const knowledgeBase = {
  id_trafo: {
    title: "Identitas Trafo",
    text: "Masukkan Nama/Kode Trafo. Penting agar data riwayat tidak tertukar!",
    color: "border-slate-600",
  },
  h2: {
    title: "Hidrogen (H2)",
    text: "Gas ini muncul jika ada 'Partial Discharge' (percikan listrik kecil).",
    color: "border-blue-500",
  },
  ch4: {
    title: "Metana (CH4)",
    text: "Indikasi minyak overheating suhu rendah (seperti memasak api kecil).",
    color: "border-emerald-500",
  },
  c2h6: {
    title: "Etana (C2H6)",
    text: "Minyak makin panas! Overheating suhu menengah.",
    color: "border-emerald-600",
  },
  c2h4: {
    title: "Etilen (C2H4)",
    text: "Awas! Thermal Fault suhu tinggi (>700°C). Minyak mendidih parah.",
    color: "border-yellow-500",
  },
  c2h2: {
    title: "Asetilen (C2H2)",
    text: "BAHAYA! Indikator Arcing (Busur Api). Energi tinggi dalam trafo!",
    color: "border-red-600 text-red-600",
  },
  co: {
    title: "Karbon Monoksida",
    text: "Kertas isolasi terbakar/terdegradasi.",
    color: "border-pink-500",
  },
  co2: {
    title: "Karbon Dioksida",
    text: "Penuaan kertas atau oksidasi normal.",
    color: "border-indigo-500",
  },
  theme: {
    title: "Ganti Tema",
    text: "Sesuaikan cahaya layar agar nyaman di mata!",
    color: "border-slate-500",
  },
};

const VoltyAssistant = ({ activeField, onClose }) => {
  const [mode, setMode] = useState("hidden"); // 'hidden', 'info', 'chat'
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState(
    "Halo! Saya Volty. Ada yang bisa dibantu tentang Trafo?"
  );
  const [isTyping, setIsTyping] = useState(false);

  // EFEK 1: JIKA PARENT MENGIRIM TRIGGER (activeField), MASUK MODE INFO
  useEffect(() => {
    if (activeField && knowledgeBase[activeField]) {
      setMode("info");
    } else if (!activeField && mode === "info") {
      setMode("hidden"); // Jika trigger hilang dan sedang mode info, sembunyi
    }
  }, [activeField]);

  // FUNGSI KIRIM CHAT KE GEMINI/LLAMA (BACKEND)
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput(""); // Kosongkan input
    setIsTyping(true); // Volty bicara (animasi mulut)
    setChatResponse("Sedang memproses..."); // Placeholder

    try {
      // Pastikan Backend Python Jalan di Port 8000
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setChatResponse(data.reply); // Tampilkan jawaban AI
    } catch (error) {
      setChatResponse(
        "Maaf, koneksi ke otak saya terputus (Backend Offline). 😢"
      );
    }
    setIsTyping(false);
  };

  // TENTUKAN ISI KONTEN BERDASARKAN MODE
  let title = "";
  let textContent = "";
  let borderColor = "border-slate-500";

  if (mode === "info" && activeField && knowledgeBase[activeField]) {
    title = knowledgeBase[activeField].title;
    textContent = knowledgeBase[activeField].text;
    borderColor = knowledgeBase[activeField].color;
  } else if (mode === "chat") {
    title = "Volty AI Chat";
    textContent = chatResponse;
    borderColor = "border-violet-500";
  }

  return (
    <>
      <AnimatePresence>
        {/* --- 1. TOMBOL CHAT FLOATING (Muncul jika Volty sedang sembunyi) --- */}
        {mode === "hidden" && (
          <motion.button
            key="chat-btn"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMode("chat")}
            className="fixed bottom-8 right-8 bg-[#1B7A8F] text-white p-4 rounded-full shadow-2xl z-40 hover:bg-[#156b7d] transition-colors flex items-center justify-center border-4 border-white"
          >
            <MessageCircle size={28} />
            {/* Badge Notifikasi Kecil */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </motion.button>
        )}

        {/* --- 2. VOLTY & BUBBLE (Muncul jika Mode Info atau Chat) --- */}
        {mode !== "hidden" && (
          <motion.div
            key="volty-container"
            className="fixed bottom-8 right-8 z-50 flex items-end gap-4 max-w-sm pointer-events-none" // pointer-events-none agar tidak menghalangi klik di belakang area kosong
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* BUBBLE PERCAKAPAN (pointer-events-auto agar bisa diklik) */}
            <div
              className={`pointer-events-auto relative bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-br-none shadow-2xl border-l-4 ${borderColor} text-slate-700 dark:text-slate-200 w-80 flex flex-col min-h-[150px] transition-colors`}
            >
              {/* Header Bubble */}
              <div className="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wide flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  💡 {title}
                </h4>
                <button
                  onClick={() => {
                    onClose();
                    setMode("hidden");
                  }}
                  className="opacity-40 hover:opacity-100 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Isi Pesan (Scrollable) */}
              <div className="text-sm leading-relaxed mb-4 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
                {textContent}
              </div>

              {/* INPUT CHAT (Hanya muncul di Mode Chat) */}
              {mode === "chat" && (
                <form onSubmit={handleSendChat} className="mt-auto relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Tanya Volty..."
                    className="w-full bg-slate-100 dark:bg-slate-900 text-xs p-3 pr-10 rounded-lg outline-none focus:ring-1 focus:ring-[#1B7A8F] transition-all text-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="absolute right-2 top-2 p-1 text-[#1B7A8F] hover:text-[#156b7d] disabled:opacity-30 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </form>
              )}
            </div>

            {/* KARAKTER VOLTY (pointer-events-auto agar bisa diklik) */}
            <motion.div
              className="w-24 h-24 flex-shrink-0 cursor-pointer pointer-events-auto"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              onClick={() => setMode(mode === "chat" ? "hidden" : "chat")}
              whileTap={{ scale: 0.9 }}
            >
              <VoltyMascot
                mood={mode === "chat" ? "explaining" : "happy"}
                isSpeaking={isTyping}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoltyAssistant;
