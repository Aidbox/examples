import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// import { dirname, resolve } from "node:path";
// import { fileURLToPath } from "node:url";

// const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // "@": resolve(__dirname, "./src"),
    },
  },
});
