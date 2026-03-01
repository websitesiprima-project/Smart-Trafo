import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tambahkan dua baris baru di bawah ini untuk mengunci jsx-runtime
      react: "react",
      "react-dom": "react-dom",
      "react/jsx-runtime": "react/jsx-runtime",
      "react/jsx-dev-runtime": "react/jsx-dev-runtime",
    },
  },
  build: {
    minify: "terser",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("leaflet") || id.includes("react-leaflet")) {
              return "vendor-maps";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
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
