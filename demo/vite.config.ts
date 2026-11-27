import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.dirname(fileURLToPath(import.meta.url)),
  envPrefix: ["FLAGSMITH_", "VITE_"],
  server: { port: 5173, strictPort: false },
});
