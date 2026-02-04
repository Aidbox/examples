import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@helsenorge/refero/index.css": resolve(
        __dirname,
        "node_modules/@helsenorge/refero/index.css"
      ),
    },
  },
});
