import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Pisahkan library besar agar tidak memblokir loading awal
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("leaflet") || id.includes("react-leaflet")) {
              return "vendor-maps";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons"; // Lucide dipisah karena ukurannya besar
            }
            if (id.includes("framer-motion")) {
              return "vendor-animation";
            }
            if (id.includes("supabase")) {
              return "vendor-db";
            }
            return "vendor-utils";
          }
        },
      },
    },
  },
});
