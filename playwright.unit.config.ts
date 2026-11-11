import { defineConfig } from "@playwright/test";

/**
 * Toda la suite corre en la zona de los usuarios (UTC-6), donde se manifiestan
 * los bugs de "un día antes" (EC-558). Se fija aquí, antes de que arranquen
 * los workers (heredan el entorno), y no dentro de cada spec: cambiar
 * `process.env.TZ` a media corrida afectaría a otros specs del mismo worker.
 */
process.env.TZ = "America/Mexico_City";

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
  /* Los specs `*.fake-window.spec.ts` instalan un `window` falso ANTES de
   * importar stores persistidos de zustand, que hidratan al crearse. Van en su
   * propio proyecto porque Playwright reutiliza el worker (y su caché de
   * módulos) entre archivos del mismo proyecto: si otro spec importara antes el
   * store sin `window`, nacería sin almacenamiento. */
  projects: [
    { name: "unit", testIgnore: /\.fake-window\.spec\.ts$/ },
    { name: "fake-window", testMatch: /\.fake-window\.spec\.ts$/ },
  ],
});
