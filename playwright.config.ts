import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración de los E2E manuales del ERP.
 *
 * El login NO se automatiza (NextAuth + credenciales + MFA opcional): el spec
 * abre `/auth/login`, llama a `page.pause()` y espera a que la persona entre a
 * mano y pulse "Resume" en el Inspector. Por eso:
 *  - `headless: false` y un solo worker: hay una persona mirando.
 *  - `timeout` de 30 min: cubre de sobra el rato que tome ese login manual.
 *  - `retries: 0`: reintentar implicaría volver a pedir el login.
 *
 * `BASE_URL` apunta por defecto al dev server local. OJO: el frontend local
 * habla con el backend de PRODUCCIÓN (`NEXT_PUBLIC_API_URL`), así que las
 * mutaciones del spec tocan datos reales — de ahí que cada prueba restaure lo
 * que cambió.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30 * 60 * 1000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    headless: false,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 1000 } },
    },
  ],
});
