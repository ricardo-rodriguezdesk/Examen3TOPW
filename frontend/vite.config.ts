import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo, /api/* se reenvía al backend local: mismo origen, igual que el rewrite de Vercel en producción.
    proxy: { "/api": "http://localhost:4000" },
  },
});
