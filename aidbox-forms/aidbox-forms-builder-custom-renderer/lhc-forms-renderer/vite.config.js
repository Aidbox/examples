import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "sdc-swm-protocol/src": resolve(
        __dirname,
        "../swm/vendor/sdc-smart-web-messaging/src/index.ts"
      ),
    },
  },
});
