import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas: el build se puede publicar en una subcarpeta (la app usa HashRouter).
  base: "./",
});
