import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./", // Ensures the correct base path for Azure Static Web Apps
  resolve: {
    alias: {
      "@mysten/sui": path.resolve(
        __dirname,
        "node_modules/@mysten/sui/dist/esm"
      ),
    },
  },
  build: {
    outDir: "dist", // Ensures build output goes to the "dist" folder
    assetsDir: "assets", // Ensures assets are in an "assets" directory
  },
  server: {
    headers: {
      "Content-Type": "application/javascript", // Ensures correct MIME type for JS
    },
  },
});
