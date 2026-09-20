import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// --host permite acceder desde el celu/otra PC en la misma red
// (o via Tailscale) usando la IP de esta máquina.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
