import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual de "Cancelar REP" en el detalle del cobro (EC-547).
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `cobro-rep-download-e2e.spec.ts`.
 *
 * Es una prueba de SOLO LECTURA y no necesita un REP timbrado de verdad:
 *  - El GET del listado de cobros y el retrieve del PRIMER cobro se interceptan
 *    y se les ponen `rep_uuid` y `rep_facturama_id` falsos (REP "timbrado")
 *    hasta que la cancelación simulada termina bien.
 *  - `POST /finanzas/cobros/{id}/cancelar-rep/` nunca llega al backend: responde
 *    lo que pida cada paso (`requested`, error `rep`, corte de red o 200).
 * Ninguna otra petición se toca.
 *
 * La cuenta necesita abrir `/finance/collections`, que el listado tenga al
 * menos un cobro y `E-FIN-FACTURAS` (o ser admin): sin el permiso el detalle no
 * ofrece "Cancelar REP" y los pasos fallan.
 *
 * Variables de entorno:
 *   BASE_URL            URL del frontend (default `http://localhost:3000`)
 *   E2E_STORAGE_STATE   Ruta a un `storageState` de Playwright con una sesión
 *                       ya iniciada (cookies de NextAuth y del backend). Con
 *                       ella no hay pausa de login y el spec corre solo.
 *
 * Ejecución (solo este archivo):
 *   npm run e2e -- tests/cobro-rep-cancel-e2e.spec.ts
 */

const STORAGE_STATE = process.env.E2E_STORAGE_STATE;
test.use({ storageState: STORAGE_STATE });

const SHOTS = "tests/screenshots";
const RUTA = "/finance/collections";
const REP_UUID = "E2E00000-0000-4000-8000-0000000EC547";
const REP_FACTURAMA_ID = "e2e-ec547";
const REP_FIELDS = {
  rep_uuid: REP_UUID,
  rep_facturama_id: REP_FACTURAMA_ID,
  rep_fecha_timbrado: "2026-10-22T12:00:00-06:00",
  rep_pendiente: false,
};
const NO_REP_FIELDS = { rep_uuid: null, rep_facturama_id: null, rep_fecha_timbrado: null, rep_pendiente: false };

const REQUESTED_MESSAGE = "[E2E] El receptor debe aceptar la cancelación ante el SAT; vuelve a cancelar cuando la acepte.";
const REP_ERROR_MESSAGE = "[E2E] El SAT no canceló el REP (estatus: rejected).";
const UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el REP pudo haberse cancelado ante el SAT. Actualiza los datos antes de volver a intentarlo.";

/** `GET /finanzas/cobros/` (el listado). */
const esListado = (url: URL) => url.pathname.endsWith("/finanzas/cobros/");
/** `GET /finanzas/cobros/{id}/` (el retrieve del precheck). */
const esRetrieve = (url: URL) => /\/finanzas\/cobros\/\d+\/$/.test(url.pathname);
/** `POST /finanzas/cobros/{id}/cancelar-rep/`. */
const esCancelarRep = (url: URL) => /\/finanzas\/cobros\/\d+\/cancelar-rep\/$/.test(url.pathname);

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

test("Cobros — cancelar el REP (requested, error rep, corte de red y éxito)", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── Intercepciones ────────────────────────────────────────────────────────
  // Id del cobro al que se le pone el REP (el primero del listado) y si la
  // cancelación simulada ya terminó bien (desde entonces se lee sin REP).
  let cobroId: number | null = null;
  let cancelado = false;
  // Último cobro objetivo leído del backend: base de la respuesta 200 simulada.
  let ultimoLeido: Record<string, unknown> = {};
  const conRep = (cobro: Record<string, unknown>) => {
    ultimoLeido = { ...cobro };
    return Object.assign(cobro, cancelado ? NO_REP_FIELDS : REP_FIELDS);
  };

  await page.route(esListado, async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    const cobros = (await response.json()) as Record<string, unknown>[];
    if (cobros[0]) {
      cobroId ??= cobros[0].id as number;
      const objetivo = cobros.find((c) => c.id === cobroId);
      if (objetivo) conRep(objetivo);
    }
    return route.fulfill({ response, json: cobros });
  });

  await page.route(esRetrieve, async (route: Route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET" || !url.pathname.endsWith(`/finanzas/cobros/${cobroId}/`)) {
      return route.fallback();
    }
    const response = await route.fetch();
    const cobro = (await response.json()) as Record<string, unknown>;
    return route.fulfill({ response, json: conRep(cobro) });
  });

  let modo: "requested" | "rep" | "red" | "ok" = "requested";
  const enviados: string[] = [];
  await page.route(esCancelarRep, async (route: Route) => {
    enviados.push(modo);
    if (modo === "requested") {
      return route.fulfill({ status: 400, json: { cancelacion_pendiente: [REQUESTED_MESSAGE] } });
    }
    if (modo === "rep") {
      return route.fulfill({ status: 400, json: { rep: [REP_ERROR_MESSAGE] } });
    }
    if (modo === "red") {
      return route.abort("failed");
    }
    // 200: el cobro vigente, ya sin REP. A partir de aquí el listado y el
    // retrieve también lo devuelven sin REP, como haría el backend.
    cancelado = true;
    return route.fulfill({ status: 200, json: { ...ultimoLeido, ...NO_REP_FIELDS } });
  });

  const botonCancelarRep = page.getByRole("button", { name: "Cancelar REP" });
  const confirmacion = page.getByRole("dialog", { name: "Cancelar REP" });
  // `includeHidden`: con el detalle abierto, el modal de Radix marca con
  // `aria-hidden` todo lo que queda fuera de él, incluido el contenedor de los
  // toasts; sin esto el rol no se encuentra aunque el toast se vea.
  const toast = (texto: string) => page.getByRole("status", { includeHidden: true }).filter({ hasText: texto });

  /** Abre la confirmación, confirma y espera a que el diálogo se cierre solo. */
  const cancelarRep = async () => {
    await botonCancelarRep.first().click();
    await expect(confirmacion).toBeVisible();
    await confirmacion.getByRole("button", { name: "Cancelar REP" }).click();
    await expect(confirmacion).toBeHidden();
  };

  // ── Paso 0: login manual ─────────────────────────────────────────────────
  await runStep("Paso 0 · Login manual (pausa)", async () => {
    if (STORAGE_STATE) return; // Sesión ya guardada: no hay login que esperar.
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

  // ── Paso 1: el detalle del cobro "timbrado" ofrece Cancelar REP ──────────
  await runStep("Paso 1 · El REP timbrado ofrece Cancelar REP en el detalle", async () => {
    await page.goto(RUTA);
    expect(new URL(page.url()).pathname, `el proxy rebotó ${RUTA}`).toBe(RUTA);
    await page.locator("tbody tr").first().getByRole("button", { name: /^Ver acciones del cobro/ }).click();
    // Solo "Ver detalle" en el menú: Cancelar REP no es acción de fila.
    await expect(page.getByRole("menuitem", { name: /Cancelar REP/ })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Ver detalle" }).click();
    await expect(page.getByText(REP_UUID)).toBeVisible();
    await expect(botonCancelarRep).toBeVisible();
    await shot(page, "cobro-rep-cancel-01-detalle.png");
  });

  // ── Paso 2: requested ────────────────────────────────────────────────────
  await runStep("Paso 2 · requested avisa con el texto del backend y el REP sigue", async () => {
    modo = "requested";
    await cancelarRep();
    await expect(toast(REQUESTED_MESSAGE)).toBeVisible();
    await expect(page.getByText(REP_UUID)).toBeVisible();
    await expect(botonCancelarRep).toBeVisible();
    await shot(page, "cobro-rep-cancel-02-requested.png");
  });

  // ── Paso 3: error rep ────────────────────────────────────────────────────
  await runStep("Paso 3 · Un 400 rep muestra el mensaje del backend tal cual", async () => {
    modo = "rep";
    await cancelarRep();
    await expect(toast(REP_ERROR_MESSAGE)).toBeVisible();
    await expect(page.getByText(REP_UUID)).toBeVisible();
  });

  // ── Paso 4: corte de red ─────────────────────────────────────────────────
  await runStep("Paso 4 · Un corte sin respuesta avisa que pudo cancelarse", async () => {
    modo = "red";
    await cancelarRep();
    await expect(toast(UNCONFIRMED_MESSAGE)).toBeVisible();
    await expect(page.getByText(REP_UUID)).toBeVisible();
  });

  // ── Paso 5: éxito ────────────────────────────────────────────────────────
  await runStep("Paso 5 · Un 200 limpia el REP en el detalle y en el listado", async () => {
    modo = "ok";
    await cancelarRep();
    await expect(toast(`REP del cobro #${cobroId} cancelado ante el SAT`)).toBeVisible();
    await expect(page.getByText(REP_UUID)).toHaveCount(0);
    await expect(botonCancelarRep).toHaveCount(0);
    await shot(page, "cobro-rep-cancel-03-cancelado.png");
    await page.keyboard.press("Escape");
    // Por el nombre exacto de su botón de acciones: un texto como `#12` también
    // casaría con otras filas.
    const fila = page.locator("tbody tr").filter({
      has: page.getByRole("button", { name: `Ver acciones del cobro #${cobroId}`, exact: true }),
    });
    await expect(fila).toHaveCount(1);
    await expect(fila).not.toContainText("Timbrado");
    expect(enviados).toEqual(["requested", "rep", "red", "ok"]);
  });

  await page.unrouteAll({ behavior: "wait" });

  // ── Resumen ───────────────────────────────────────────────────────────────
  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log("RESUMEN — cancelar el REP del cobro");
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
