import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    minify: "terser",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // PERATURAN EMAS: Jangan pernah membuat kondisi untuk "react" atau "react-dom"
            // Biarkan Vite yang memecah React secara otomatis.

            // Kita HANYA memecah library pihak ketiga yang ukurannya raksasa:
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("leaflet") || id.includes("react-leaflet")) {
              return "vendor-maps";
            }
            if (id.includes("framer-motion")) {
              return "vendor-animation";
            }
            if (id.includes("supabase")) {
              return "vendor-db";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }

            // Sisa library lainnya akan diurus otomatis oleh Vite
          }
        },
      },
    },
  },
});
