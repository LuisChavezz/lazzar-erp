import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual del contrato de `useGuardedQuery` (`src/hooks/useGuardedQuery.ts`),
 * fijado sobre una lista que lo usa: Órdenes de compra (`usePurchaseOrders`).
 *
 * CÓRRELO AL TOCAR `useGuardedQuery` o `useHasLoadedQuery`: todos los hooks de
 * datos migrados dependen de ese par, así que un cambio ahí afecta a todas sus
 * vistas a la vez.
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `module-nav-hover-e2e.spec.ts`.
 *
 * Es una prueba de SOLO LECTURA. Los fallos se fuerzan interceptando el GET
 * del listado (respuesta 500); cualquier otro método pasa sin tocar. El
 * refetch se dispara con el botón "Actualizar datos" de la tabla, como lo
 * haría una persona: no hay código de prueba en `src`.
 *
 * Contrato que cubre:
 *  - Un REFETCH fallido conserva las filas ya cargadas, deja montada la barra
 *    de la tabla y avisa con EXACTAMENTE un toast (la vista monta dos
 *    observadores del mismo listado: la tabla y los indicadores).
 *  - Una CARGA INICIAL fallida muestra el estado de error de la tabla, con la
 *    barra montada y sin toast.
 *  - Al quitar la intercepción, las dos situaciones se recuperan con
 *    "Actualizar datos" y no queda error ni toast.
 *
 * `retry: 1` en el QueryClient: cada fallo son DOS peticiones (el intento y su
 * reintento), por eso los pasos esperan a la segunda antes de afirmar nada.
 *
 * Variables de entorno:
 *   BASE_URL  URL del frontend (default `http://localhost:3000`)
 *
 * La cuenta necesita poder abrir `/procurement/purchase-orders` y que el
 * listado tenga al menos una orden.
 *
 * Ejecución (solo este archivo; `npm run e2e` a secas corre TODOS los specs):
 *   npm run e2e -- tests/guarded-query-e2e.spec.ts
 */

const SHOTS = "tests/screenshots";

/** Vista bajo prueba y lo que la identifica. Si cambias una, cambia las tres. */
const RUTA = "/procurement/purchase-orders";
/** `GET /compras/ordenes/` — el detalle y los indicadores cuelgan de otra ruta. */
const esListado = (url: URL) => url.pathname.endsWith("/compras/ordenes/");
const TITULO_ERROR = "Error al cargar órdenes de compra";

const TEXTO_TOAST = "No se pudo actualizar la información. Mostrando datos anteriores.";

/** Dos peticiones fallidas (`retry: 1`, ~1 s de espera entre ambas) + margen. */
const ESPERA_FALLO = 20_000;
/** Margen para afirmar que algo NO apareció (un segundo toast). */
const ESPERA_SIN_CAMBIO = 1_500;

// ── Utilidades ───────────────────────────────────────────────────────────────

type StepStatus = "PASS" | "FAIL" | "SKIP";
const results: { step: string; status: StepStatus; note?: string }[] = [];

/**
 * Ejecuta un bloque y REGISTRA su resultado sin abortar el resto (mismo
 * contrato que en `module-nav-hover-e2e.spec.ts`).
 */
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

// ── Suite ────────────────────────────────────────────────────────────────────

test("useGuardedQuery — refetch fallido, carga inicial fallida y recuperación", async ({
  page,
}) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── Localizadores ─────────────────────────────────────────────────────────
  const filas = page.locator("tbody tr");
  const buscador = page.getByPlaceholder(/^Buscar/).first();
  const actualizar = page.getByRole("button", { name: "Actualizar datos" });
  const estadoError = page.getByText(TITULO_ERROR);
  // `react-hot-toast` pinta cada aviso con `role="status"`; se acota por texto
  // porque la app tiene otros `status` (p. ej. avisos inline).
  const toast = page.getByRole("status").filter({ hasText: TEXTO_TOAST });

  // ── Intercepción ──────────────────────────────────────────────────────────
  // Solo el GET del listado responde 500; el handler resuelve SIEMPRE en el
  // acto (nunca retiene una petición) y deja pasar cualquier otro método.
  let fallos = 0;
  const fallarListado = async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    fallos += 1;
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "500 forzado por guarded-query-e2e" }),
    });
  };
  const interceptar = async () => {
    fallos = 0;
    await page.route(esListado, fallarListado);
  };
  const dejarPasar = () => page.unroute(esListado, fallarListado);

  /** Estado conocido: la lista recién cargada, con filas y sin intercepción. */
  async function empezarConLista() {
    await page.goto(RUTA);
    expect(
      new URL(page.url()).pathname,
      `el proxy rebotó ${RUTA}: la cuenta necesita acceso a Órdenes de compra`,
    ).toBe(RUTA);
    await expect(filas.first(), "el listado necesita al menos una orden").toBeVisible({
      timeout: 60_000,
    });
  }

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
    console.log(`  Sesión iniciada — URL actual: ${page.url()}`);
  });

  // ── Paso 1: refetch fallido tras una carga exitosa ────────────────────────
  await runStep("Paso 1 · Un refetch fallido conserva las filas y da un solo toast", async () => {
    await empezarConLista();
    const filasAntes = await filas.count();
    const primeraFila = (await filas.first().innerText()).trim();

    await interceptar();
    try {
      await actualizar.click();
      // El intento y su reintento: hasta el segundo la consulta no queda en error.
      await expect.poll(() => fallos, { timeout: ESPERA_FALLO }).toBe(2);

      await expect(toast).toHaveCount(1);
      await shot(page, "guarded-query-01-refetch-fallido.png");

      // Lo cargado sigue en pantalla y la barra de la tabla sigue montada.
      await expect(filas).toHaveCount(filasAntes);
      expect((await filas.first().innerText()).trim()).toBe(primeraFila);
      await expect(estadoError).toBeHidden();
      await expect(buscador).toBeVisible();
      await expect(actualizar).toBeVisible();

      // Sigue siendo UNO: ni el segundo observador ni el reintento avisan otra vez.
      await page.waitForTimeout(ESPERA_SIN_CAMBIO);
      await expect(toast).toHaveCount(1);
      expect(fallos, "un refetch fallido son dos peticiones, no más").toBe(2);
    } finally {
      await dejarPasar();
    }
  });

  // ── Paso 2: recuperación tras el refetch fallido ──────────────────────────
  await runStep("Paso 2 · Sin la intercepción, el refetch se recupera sin error ni toast", async () => {
    // El toast del paso anterior caduca solo; se espera para no confundirlo.
    await expect(toast).toHaveCount(0, { timeout: 15_000 });

    const respuesta = page.waitForResponse(
      (res) => esListado(new URL(res.url())) && res.request().method() === "GET",
      { timeout: 60_000 },
    );
    await actualizar.click();
    expect((await respuesta).status(), "el listado debe responder bien").toBe(200);

    await expect(filas.first()).toBeVisible();
    await expect(estadoError).toBeHidden();
    await page.waitForTimeout(ESPERA_SIN_CAMBIO);
    await expect(toast).toHaveCount(0);
  });

  // ── Paso 3: carga inicial fallida ─────────────────────────────────────────
  await runStep("Paso 3 · Una carga inicial fallida muestra el error, sin toast", async () => {
    await interceptar();
    try {
      // Recarga completa: la caché de TanStack Query empieza vacía.
      await page.goto(RUTA);
      await expect(estadoError).toBeVisible({ timeout: ESPERA_FALLO });
      await shot(page, "guarded-query-02-carga-inicial-fallida.png");

      await expect(filas).toHaveCount(0);
      // La barra sigue montada: el error ocupa solo el área de datos.
      await expect(buscador).toBeVisible();
      await expect(actualizar).toBeVisible();
      // Sin datos previos no hay "datos anteriores" que avisar.
      await page.waitForTimeout(ESPERA_SIN_CAMBIO);
      await expect(toast).toHaveCount(0);
    } finally {
      await dejarPasar();
    }
  });

  // ── Paso 4: recuperación tras la carga inicial fallida ────────────────────
  await runStep("Paso 4 · Sin la intercepción, la carga inicial se recupera", async () => {
    await actualizar.click();
    await expect(filas.first()).toBeVisible({ timeout: 60_000 });
    await expect(estadoError).toBeHidden();
    await expect(toast).toHaveCount(0);
  });

  // ── Resumen ───────────────────────────────────────────────────────────────
  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log("RESUMEN — contrato de useGuardedQuery");
  console.log("═".repeat(ancho + 30));
  console.log(`Vista de prueba: ${RUTA}`);
  console.log("─".repeat(ancho + 30));
  for (const { step, status, note } of results) {
    const icono = status === "PASS" ? "✔" : status === "FAIL" ? "✖" : "⏭";
    console.log(`${icono} ${step.padEnd(ancho)}  ${status}${note ? ` — ${note}` : ""}`);
  }
  const fallidos = results.filter((r) => r.status === "FAIL");
  console.log("═".repeat(ancho + 30));
  console.log(
    `${results.filter((r) => r.status === "PASS").length} PASS · ` +
      `${fallidos.length} FAIL · ` +
      `${results.filter((r) => r.status === "SKIP").length} SKIP`,
  );
  console.log(`Capturas en ${SHOTS}/\n`);

  // `runStep` traga lo que se lanza; esta aserción final traslada el resultado
  // real al código de salida (mismo motivo que en `module-nav-hover-e2e.spec.ts`).
  expect(
    fallidos.length,
    `Pasos fallidos: ${fallidos.map((r) => r.step).join(", ")}`,
  ).toBe(0);
});
