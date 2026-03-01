import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 1. Memaksa Vercel membaca file internal React dengan benar
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    minify: "terser",
    // 2. Membesarkan limit agar Vercel tidak rewel soal ukuran file
    chunkSizeWarningLimit: 2000,

    // BLOK ROLLUPOPTIONS DAN MANUALCHUNKS DIHAPUS TOTAL
  },
});
