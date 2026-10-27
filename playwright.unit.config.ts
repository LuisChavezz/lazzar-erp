import { defineConfig } from "@playwright/test";

/**
 * Pruebas unitarias (funciones puras) con el runner de Playwright: sin
 * navegador, sin dev server y sin login, así que corren solas y en segundos.
 * Viven en `tests/unit/` y la config de los E2E (`playwright.config.ts`) las
 * ignora. Correr: `npm run test:unit`.
 */
export default defineConfig({
  testDir: "./tests/unit",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
});
