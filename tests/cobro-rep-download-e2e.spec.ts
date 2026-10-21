import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual de "Descargar PDF/XML" del REP en el detalle del cobro (EC-545).
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `guarded-query-e2e.spec.ts`.
 *
 * Es una prueba de SOLO LECTURA y no necesita un REP timbrado de verdad:
 *  - El GET del listado de cobros se intercepta y al PRIMER cobro se le ponen
 *    `rep_uuid` y `rep_facturama_id` falsos (REP "timbrado"), de modo que el
 *    detalle ofrece las descargas.
 *  - El passthrough `facturama/cfdi/{pdf|xml}/issued/{id}/` responde lo que pida
 *    cada paso (archivo base64, 403 o 502): nunca sale a Facturama.
 * Ninguna otra petición se toca.
 *
 * La cuenta necesita abrir `/finance/collections`, que el listado tenga al
 * menos un cobro y `R-FIN-FACTURAMA` (o ser admin): sin el permiso el detalle
 * muestra la nota en lugar de los botones y los pasos de descarga fallan.
 *
 * Variables de entorno:
 *   BASE_URL  URL del frontend (default `http://localhost:3000`)
 *
 * Ejecución (solo este archivo):
 *   npm run e2e -- tests/cobro-rep-download-e2e.spec.ts
 */

const SHOTS = "tests/screenshots";
const RUTA = "/finance/collections";
const REP_UUID = "E2E00000-0000-4000-8000-0000000EC545";
const REP_FACTURAMA_ID = "e2e-ec545";

/** `GET /finanzas/cobros/` (el listado; el retrieve lleva el id en la ruta). */
const esListado = (url: URL) => url.pathname.endsWith("/finanzas/cobros/");
/** `GET /finanzas/facturama/cfdi/{formato}/issued/{id}/`. */
const esPassthrough = (url: URL) => /\/finanzas\/facturama\/cfdi\/(pdf|xml)\/issued\/[^/]+\/$/.test(url.pathname);

const PDF = "%PDF-1.4\n% e2e EC-545\n";
const XML = `<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante TipoDeComprobante="P" UUID="${REP_UUID}"/>`;

type StepStatus = "PASS" | "FAIL" | "SKIP";
const results: { step: string; status: StepStatus; note?: string }[] = [];

async function runStep(name: string, fn: () => Promise<void>) {
  console.log(`\n▶ ${name}`);
  try {
    await test.step(name, fn);
    results.push({ step: name, status: "PASS" });
    console.log(`  ✔ ${name}`);
  } catch (error) {
    const note = (error instanceof Error ? error.message : String(error)).split("\n")[0];
    results.push({ step: name, status: "FAIL", note });
    console.log(`  ✖ ${name} — ${note}`);
  }
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  console.log(`  📸 ${name}`);
}

test("Cobros — descarga del REP (PDF, XML, 403 y 502)", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── Intercepciones ────────────────────────────────────────────────────────
  // El listado pasa al backend y se le pone el REP al primer cobro.
  await page.route(esListado, async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    const cobros = (await response.json()) as Record<string, unknown>[];
    if (cobros[0]) {
      Object.assign(cobros[0], {
        rep_uuid: REP_UUID,
        rep_facturama_id: REP_FACTURAMA_ID,
        rep_fecha_timbrado: "2026-10-21T12:00:00-06:00",
        rep_pendiente: false,
      });
    }
    return route.fulfill({ response, json: cobros });
  });

  // El passthrough responde según `modo`; cada handler resuelve en el acto.
  let modo: "archivo" | "403" | "502" = "archivo";
  const pedidas: string[] = [];
  await page.route(esPassthrough, async (route: Route) => {
    const url = new URL(route.request().url());
    pedidas.push(url.pathname);
    if (modo === "403") {
      return route.fulfill({ status: 403, json: { detail: "No tienes acceso a Facturama." } });
    }
    if (modo === "502") {
      return route.fulfill({
        status: 502,
        json: { error: "FACTURAMA_TIMEOUT", message: "Facturama request timed out.", details: null },
      });
    }
    const contenido = url.pathname.includes("/pdf/") ? PDF : XML;
    return route.fulfill({
      status: 200,
      json: {
        ContentEncoding: "base64",
        ContentType: url.pathname.includes("/pdf/") ? "pdf" : "xml",
        Content: Buffer.from(contenido).toString("base64"),
      },
    });
  });

  const botonPdf = page.getByRole("button", { name: "Descargar PDF" });
  const botonXml = page.getByRole("button", { name: "Descargar XML" });
  const toast = (texto: string) => page.getByRole("status").filter({ hasText: texto });

  // ── Paso 0: login manual ─────────────────────────────────────────────────
  await runStep("Paso 0 · Login manual (pausa)", async () => {
    await page.goto("/auth/login");
    console.log(`
  ┌──────────────────────────────────────────────────────────────┐
  │  PAUSA — entra a mano en la ventana del navegador:           │
  │    1. Captura usuario y contraseña (y MFA si aplica).        │
  │    2. Si te manda a /select-branch, elige empresa/sucursal.  │
  │    3. Pulsa ▶ "Resume" en el Playwright Inspector.           │
  └──────────────────────────────────────────────────────────────┘`);
    await page.pause();
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page).not.toHaveURL(/\/select-branch/);
  });

  // ── Paso 1: el detalle del cobro "timbrado" ofrece las descargas ─────────
  await runStep("Paso 1 · El REP timbrado ofrece Descargar PDF y Descargar XML", async () => {
    await page.goto(RUTA);
    expect(new URL(page.url()).pathname, `el proxy rebotó ${RUTA}`).toBe(RUTA);
    await page.locator("tbody tr").first().getByTitle("Ver detalle").click();
    await expect(page.getByText(REP_UUID)).toBeVisible();
    await expect(botonPdf).toBeVisible();
    await expect(botonXml).toBeVisible();
    await expect(page.getByRole("button", { name: "Timbrar REP" })).toHaveCount(0);
    await shot(page, "cobro-rep-download-01-detalle.png");
  });

  // ── Paso 2: PDF ──────────────────────────────────────────────────────────
  await runStep("Paso 2 · Descargar PDF baja REP-{uuid}.pdf con el contenido decodificado", async () => {
    modo = "archivo";
    const [descarga] = await Promise.all([page.waitForEvent("download"), botonPdf.click()]);
    expect(descarga.suggestedFilename()).toBe(`REP-${REP_UUID}.pdf`);
    const ruta = await descarga.path();
    expect(fs.readFileSync(ruta, "utf8")).toBe(PDF);
    expect(pedidas.at(-1)).toMatch(new RegExp(`/finanzas/facturama/cfdi/pdf/issued/${REP_FACTURAMA_ID}/$`));
  });

  // ── Paso 3: XML ──────────────────────────────────────────────────────────
  await runStep("Paso 3 · Descargar XML baja REP-{uuid}.xml con el contenido decodificado", async () => {
    modo = "archivo";
    const [descarga] = await Promise.all([page.waitForEvent("download"), botonXml.click()]);
    expect(descarga.suggestedFilename()).toBe(`REP-${REP_UUID}.xml`);
    expect(fs.readFileSync(await descarga.path(), "utf8")).toBe(XML);
    expect(pedidas.at(-1)).toMatch(new RegExp(`/finanzas/facturama/cfdi/xml/issued/${REP_FACTURAMA_ID}/$`));
  });

  // ── Paso 4: 403 ──────────────────────────────────────────────────────────
  await runStep("Paso 4 · Un 403 avisa con el detail del backend", async () => {
    modo = "403";
    await botonPdf.click();
    await expect(toast("No tienes acceso a Facturama.")).toBeVisible();
    await expect(botonPdf).toBeEnabled();
    await shot(page, "cobro-rep-download-02-403.png");
  });

  // ── Paso 5: 502 ──────────────────────────────────────────────────────────
  await runStep("Paso 5 · Un 502 avisa que Facturama no entregó el archivo", async () => {
    modo = "502";
    await botonXml.click();
    await expect(toast("Facturama no entregó el archivo. Intenta de nuevo más tarde.")).toBeVisible();
    await expect(botonXml).toBeEnabled();
    await shot(page, "cobro-rep-download-03-502.png");
  });

  await page.unrouteAll({ behavior: "wait" });

  // ── Resumen ───────────────────────────────────────────────────────────────
  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log("RESUMEN — descarga del REP del cobro");
  console.log("═".repeat(ancho + 30));
  for (const { step, status, note } of results) {
    const icono = status === "PASS" ? "✔" : status === "FAIL" ? "✖" : "⏭";
    console.log(`${icono} ${step.padEnd(ancho)}  ${status}${note ? ` — ${note}` : ""}`);
  }
  const fallidos = results.filter((r) => r.status === "FAIL");
  console.log("═".repeat(ancho + 30));
  console.log(`${results.length - fallidos.length} PASS · ${fallidos.length} FAIL`);
  console.log(`Capturas en ${SHOTS}/\n`);

  expect(fallidos.length, `Pasos fallidos: ${fallidos.map((r) => r.step).join(", ")}`).toBe(0);
});
