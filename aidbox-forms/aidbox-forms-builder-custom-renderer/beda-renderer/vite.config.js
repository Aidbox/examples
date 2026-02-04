import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "aidbox-react/lib/services/service": resolve(
        __dirname,
        "src/aidbox-service.ts"
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
