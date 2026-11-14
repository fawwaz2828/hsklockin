import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { chunkSizeWarningLimit: 1000 },
  // port khusus supaya tidak bentrok dengan project lain di 5173
  server: { host: "127.0.0.1", port: 5180, strictPort: true, open: true },
});
