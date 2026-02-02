import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "sdc-swm-protocol/src": resolve(
        __dirname,
        "vendor/sdc-smart-web-messaging/src/index.ts"
      ),
      "aidbox-react/lib/services/service": resolve(
        __dirname,
        "src/shims/aidbox-service.ts"
      ),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  optimizeDeps: {
    include: [
      "lodash",
      "tiny-case",
      "property-expr",
      "toposort",
      "sdc-qrf",
      "@beda.software/fhir-questionnaire",
    ],
    esbuildOptions: {
      jsx: "automatic",
    },
  },
});
