import React from "react";
import { motion } from "framer-motion";

const VoltyMascot = ({ mood = "happy", isSpeaking = false }) => {
  // Variasi Mata
  const eyes = {
    happy: (
      <>
        <motion.circle
          cx="35"
          cy="45"
          r="5"
          fill="#1e293b"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
        />
        <motion.circle
          cx="65"
          cy="45"
          r="5"
          fill="#1e293b"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
        />
      </>
    ),
    explaining: (
      <>
        {/* Mata membesar karena antusias menjelaskan */}
        <motion.ellipse cx="35" cy="45" rx="6" ry="7" fill="#1e293b" />
        <motion.ellipse cx="65" cy="45" rx="6" ry="7" fill="#1e293b" />
        {/* Alis terangkat */}
        <path
          d="M 25 38 Q 35 30 45 38"
          stroke="#1e293b"
          strokeWidth="2"
          fill="transparent"
        />
        <path
          d="M 55 38 Q 65 30 75 38"
          stroke="#1e293b"
          strokeWidth="2"
          fill="transparent"
        />
      </>
    ),
  };

  return (
    <motion.svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      className="drop-shadow-2xl"
    >
      {/* BADAN (Bergerak naik turun - Hovering) */}
      <motion.g
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        {/* Badan Robot */}
        <rect
          x="20"
          y="20"
          width="60"
          height="50"
          rx="12"
          fill="#FFD700"
          stroke="#b45309"
          strokeWidth="3"
        />

        {/* Antena (Bergoyang) */}
        <motion.g
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ originX: "50px", originY: "20px" }}
        >
          <line
            x1="50"
            y1="20"
            x2="50"
            y2="5"
            stroke="#1e293b"
            strokeWidth="3"
          />
          <motion.circle
            cx="50"
            cy="5"
            r="5"
            fill="#ef4444"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        </motion.g>

        {/* Layar Muka */}
        <rect x="25" y="30" width="50" height="35" rx="6" fill="#ffffff" />

        {/* Mata Dinamis */}
        {mood === "explaining" ? eyes.explaining : eyes.happy}

        {/* Mulut (Bergerak jika bicara) */}
        {isSpeaking ? (
          <motion.ellipse
            cx="50"
            cy="55"
            rx="5"
            ry="3"
            fill="#1e293b"
            animate={{ ry: [2, 5, 2] }}
            transition={{ repeat: Infinity, duration: 0.2 }}
          />
        ) : (
          <path
            d="M 42 55 Q 50 60 58 55"
            stroke="#1e293b"
            strokeWidth="2"
            fill="transparent"
          />
        )}

        {/* Tangan (Melambai) */}
        <motion.rect
          x="8"
          y="35"
          width="12"
          height="25"
          rx="6"
          fill="#1B7A8F"
          animate={{ rotate: [0, -15, 0], y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <motion.rect
          x="80"
          y="35"
          width="12"
          height="25"
          rx="6"
          fill="#1B7A8F"
          animate={{ rotate: [0, 15, 0], y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 1 }}
        />
      </motion.g>

      {/* Efek Bayangan di Bawah (Mengecil membesar saat terbang) */}
      <motion.ellipse
        cx="50"
        cy="90"
        rx="20"
        ry="3"
        fill="black"
        opacity="0.2"
        animate={{ rx: [20, 15, 20], opacity: [0.2, 0.1, 0.2] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

export default VoltyMascot;
