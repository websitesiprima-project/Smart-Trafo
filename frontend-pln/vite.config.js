import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 1. Minify code agar lebih kecil
    minify: "terser",
    // 2. Pecah file besar menjadi potongan kecil (Code Splitting)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Pisahkan library besar ke file terpisah agar bisa di-cache browser
          if (id.includes("node_modules")) {
            // --- BAGIAN INI DIHAPUS AGAR TIDAK CRASH ---
            // if (id.includes("react-leaflet") || id.includes("leaflet")) {
            //   return "leaflet-vendor";
            // }
            // -------------------------------------------

            // Pisahkan Recharts (Grafik) karena filenya besar & aman dipisah
            if (id.includes("recharts")) {
              return "recharts-vendor";
            }

            // Sisanya (termasuk React, Leaflet, Framer Motion, dll) gabung jadi satu
            return "vendor";
          }
        },
      },
    },
  },
});
