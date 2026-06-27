import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-three/postprocessing") || id.includes("postprocessing")) {
            return "vendor-postfx";
          }
          if (id.includes("@react-three/fiber")) {
            return "vendor-r3f";
          }
          if (id.includes("three")) {
            return "vendor-three";
          }
          if (id.includes("react-dom") || id.includes("react")) {
            return "vendor-react";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          return undefined;
        },
      },
    },
  },
}));
