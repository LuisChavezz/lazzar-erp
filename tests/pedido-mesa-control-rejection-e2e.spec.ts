import { test, expect, type Page, type Request, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E de los rechazos al guardar la edición de Mesa de Control (EC-762).
 *
 * El 400 `servicios_extras` (servicios ya facturados) no se puede provocar hoy
 * contra el backend real: el bloqueo `factura_detalle_ligado` responde 409
 * antes. Por eso `POST /ventas/pedidos/{id}/editar-mesa-control/` NUNCA llega
 * al backend: cada paso lo responde con un cuerpo simulado. Cualquier otra
 * escritura al backend se aborta, así que la prueba es de SOLO LECTURA.
 *
 * Pasos (cada uno recarga la pantalla y cambia el monto del primer servicio
 * extra antes de guardar):
 *  a. 400 con dos mensajes de `servicios_extras`: un toast con una línea por
 *     servicio que dura más que un error normal, sin scroll ni foco hacia la
 *     sección de servicios extras, y el pedido no se guarda.
 *  b. 400 con un solo mensaje: el toast lo muestra.
 *  c. 400 `permiso`: el toast lo muestra, sin scroll ni foco.
 *  d. 409 `factura_detalle_ligado` (mismo cuerpo que el precheck): la pantalla
 *     cambia a la lista de bloqueos, sin toast.
 *
 * Necesita una sesión con acceso a Mesa de Control y un pedido EDITABLE
 * (`editar-mesa-control-contexto` con `editable: true`) que tenga al menos un
 * servicio extra.
 *
 * Variables de entorno:
 *   BASE_URL                URL del frontend (default `http://localhost:3000`)
 *   E2E_PEDIDO_ID           Id del pedido editable (obligatoria)
 *   E2E_STORAGE_STATE       `storageState` con la sesión ya iniciada; sin ella,
 *                           pausa para el login manual
 *   E2E_BACKEND_READ_PROXY  Opcional: URL de un proxy local de SOLO LECTURA del
 *                           backend (p. ej. `http://127.0.0.1:8765`). Con ella
 *                           los GET al backend se sirven desde ahí (útil cuando
 *                           la sesión no trae las cookies del backend).
 *   E2E_SHOTS_DIR           Carpeta de capturas (default `tests/screenshots`)
 *
 * Ejecución (solo este archivo):
 *   E2E_PEDIDO_ID=<id> npm run e2e -- tests/pedido-mesa-control-rejection-e2e.spec.ts
 */

const STORAGE_STATE = process.env.E2E_STORAGE_STATE;
test.use({ storageState: STORAGE_STATE });

const PEDIDO_ID = process.env.E2E_PEDIDO_ID;
const READ_PROXY = process.env.E2E_BACKEND_READ_PROXY;
const SHOTS = process.env.E2E_SHOTS_DIR ?? "tests/screenshots";
const RUTA = `/orders/${PEDIDO_ID}/edit-mesa-control?from=operations`;

const FACTURADO = "[E2E] Bordado: está en la factura F-1; no se cambia su importe ni se oculta.";
const ELIMINADO = "[E2E] Flete: ya se facturó; no se puede eliminar.";
const PERMISO = "[E2E] Acción disponible solo para mesa de control.";
/** Textos del backend (`ACCIONES_BLOQUEO_MESA_CONTROL`, `_build_editar_mesa_control_contexto`). */
const ACCION_FACTURA_DETALLE = "Cancelar la factura y limpiar su detalle antes de editar el pedido.";
const MENSAJE_BLOQUEO =
  "El pedido tiene documentos operativos/contables/logísticos ligados. Deben cancelarse o darse de baja manualmente antes de editarlo desde mesa de control.";
/** Default de `react-hot-toast` para `toast.error`. */
const DEFAULT_ERROR_TOAST_MS = 4000;

/** `POST /ventas/pedidos/{id}/editar-mesa-control/`. */
const esEditar = (url: URL) => /\/ventas\/pedidos\/\d+\/editar-mesa-control\/$/.test(url.pathname);
/** `GET /ventas/pedidos/{id}/editar-mesa-control-contexto/` (el precheck). */
const esContexto = (url: URL) =>
  /\/ventas\/pedidos\/\d+\/editar-mesa-control-contexto\/$/.test(url.pathname);

type StepStatus = "PASS" | "FAIL";
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
  await page.screenshot({ path: path.join(SHOTS, name) });
  console.log(`  📸 ${name}`);
}

test("Mesa de Control — rechazos del guardado (servicios_extras, permiso, 409)", async ({ page }) => {
  test.skip(!PEDIDO_ID, "Falta E2E_PEDIDO_ID (un pedido editable con servicios extras).");
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── Espía de scroll: el formulario lleva la vista al primer error con
  // `scrollIntoView`; ningún rechazo de solo-toast debe provocarlo. ──────────
  await page.addInitScript(() => {
    const w = window as unknown as { __scrolls: string[] };
    w.__scrolls = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      w.__scrolls.push(
        this.getAttribute("name") ?? this.getAttribute("data-error-anchor") ?? this.tagName,
      );
      return original.call(this, arg);
    };
  });

  // ── Intercepciones ────────────────────────────────────────────────────────
  const cors = (request: Request) => ({
    "access-control-allow-origin": new URL(page.url() || "http://localhost").origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": request.headers()["access-control-request-headers"] ?? "content-type",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  });
  const esBackend = (url: URL) =>
    url.pathname.startsWith("/api/v1/") && url.origin !== new URL(page.url() || "http://x").origin;

  // Guardia general: ninguna escritura al backend sale del navegador. Con
  // proxy de lectura, los GET se sirven desde él.
  const escriturasAbortadas: string[] = [];
  await page.route(esBackend, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    if (method === "OPTIONS") {
      return READ_PROXY ? route.fulfill({ status: 204, headers: cors(request) }) : route.fallback();
    }
    if (method !== "GET") {
      escriturasAbortadas.push(`${method} ${request.url()}`);
      return route.abort("blockedbyclient");
    }
    if (!READ_PROXY) return route.fallback();
    const url = new URL(request.url());
    const response = await fetch(`${READ_PROXY}${url.pathname}${url.search}`);
    // Una navegación a media lectura deja la ruta ya resuelta: se ignora.
    return route
      .fulfill({
        status: response.status,
        headers: { ...cors(request), "content-type": response.headers.get("content-type") ?? "application/json" },
        body: Buffer.from(await response.arrayBuffer()),
      })
      .catch(() => undefined);
  });

  // Último contexto leído del precheck: base del cuerpo del 409 simulado.
  let contexto: Record<string, unknown> | null = null;
  page.on("response", async (response) => {
    if (response.request().method() === "GET" && esContexto(new URL(response.url())) && response.ok()) {
      contexto = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    }
  });

  // El guardado: registrada DESPUÉS, así que se evalúa antes que la guardia.
  // Siempre se responde (nunca `continue`/`fallback`), con un pequeño retraso
  // para medir lo que pasa entre el clic y la respuesta.
  type Modo = "servicios-varios" | "servicios-uno" | "permiso" | "409";
  let modo: Modo = "servicios-varios";
  const guardados: Modo[] = [];
  await page.route(esEditar, async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors(request) });
    }
    if (request.method() !== "POST") return route.abort("blockedbyclient");
    guardados.push(modo);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const headers = cors(request);
    if (modo === "servicios-varios") {
      return route.fulfill({ status: 400, headers, json: { servicios_extras: [FACTURADO, ELIMINADO] } });
    }
    if (modo === "servicios-uno") {
      return route.fulfill({ status: 400, headers, json: { servicios_extras: [FACTURADO] } });
    }
    if (modo === "permiso") {
      return route.fulfill({ status: 400, headers, json: { permiso: [PERMISO] } });
    }
    const base = contexto ?? { pedido_id: Number(PEDIDO_ID) };
    return route.fulfill({
      status: 409,
      headers,
      json: {
        ...base,
        editable: false,
        requiere_cancelacion_previa: true,
        codigo: "pedido_con_bloqueos",
        mensaje: MENSAJE_BLOQUEO,
        bloqueos: [{ tipo: "factura_detalle_ligado", accion_requerida: ACCION_FACTURA_DETALLE }],
        tipos_bloqueo: ["factura_detalle_ligado"],
      },
    });
  });

  // `includeHidden`: con un modal de Radix abierto el contenedor de los toasts
  // queda `aria-hidden`.
  const toasts = page.getByRole("status", { includeHidden: true });
  const toast = (texto: string) => toasts.filter({ hasText: texto });
  const guardar = page.getByRole("button", { name: "Guardar cambios del pedido" });
  const seccionServicios = page.locator('[data-error-anchor="servicios_extras"]');

  /** Carga la pantalla, cambia el monto del primer servicio extra y guarda. */
  const editarYGuardar = async (m: Modo) => {
    modo = m;
    await page.goto(RUTA);
    expect(new URL(page.url()).pathname, `el proxy rebotó ${RUTA}`).toBe(`/orders/${PEDIDO_ID}/edit-mesa-control`);
    const monto = page.locator('input[name="servicios_extras.0.monto"]');
    await expect(monto).toBeVisible({ timeout: 90_000 });
    await monto.fill("123.45");
    await guardar.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      (window as unknown as { __scrolls: string[] }).__scrolls = [];
    });
    const antes = await seccionServicios.evaluate((el) => el.getBoundingClientRect().top);
    await guardar.click();
    return antes;
  };

  /** Ni `scrollIntoView` hacia un error, ni foco en un servicio, ni la sección movida. */
  const expectSinScrollNiFoco = async (antes: number) => {
    await page.waitForTimeout(800); // el scroll del formulario corre en un rAF tras el error
    const scrolls = await page.evaluate(() => (window as unknown as { __scrolls: string[] }).__scrolls);
    expect(scrolls, "scrollIntoView tras el rechazo").toEqual([]);
    const foco = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.name ?? "");
    expect(foco.startsWith("servicios_extras"), `foco en ${foco}`).toBe(false);
    const despues = await seccionServicios.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(despues - antes), "la sección de servicios extras se movió").toBeLessThan(2);
  };

  /** Sigue en la pantalla de edición y no hubo toast de éxito. */
  const expectNoGuardado = async () => {
    await expect(page).toHaveURL(new RegExp(`/orders/${PEDIDO_ID}/edit-mesa-control`));
    await expect(toast("Pedido actualizado")).toHaveCount(0);
  };

  try {
    // ── Paso 0: login manual ───────────────────────────────────────────────
    await runStep("Paso 0 · Login manual (pausa)", async () => {
      if (STORAGE_STATE) return;
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
    });

    // ── a. Varios servicios ────────────────────────────────────────────────
    await runStep("a · 400 servicios_extras con dos mensajes", async () => {
      const antes = await editarYGuardar("servicios-varios");
      const t = toast(FACTURADO);
      await expect(t).toBeVisible();
      await expect(t).toContainText(ELIMINADO);
      const lineas = (await t.innerText()).split("\n").map((l) => l.trim()).filter(Boolean);
      expect(lineas).toEqual([FACTURADO, ELIMINADO]);
      await shot(page, "pedido-mesa-control-rejection-a-servicios-varios.png");
      await expectSinScrollNiFoco(antes);
      await expectNoGuardado();
      // Dura más que un error normal: sigue visible pasado el default.
      await page.waitForTimeout(DEFAULT_ERROR_TOAST_MS + 2500);
      await expect(t).toBeVisible();
    });

    // ── b. Un servicio ─────────────────────────────────────────────────────
    await runStep("b · 400 servicios_extras con un mensaje", async () => {
      const antes = await editarYGuardar("servicios-uno");
      const t = toast(FACTURADO);
      await expect(t).toBeVisible();
      expect((await t.innerText()).trim()).toBe(FACTURADO);
      await expectSinScrollNiFoco(antes);
      await expectNoGuardado();
      // Duración normal: ya se fue cuando el de varios seguía visible.
      await page.waitForTimeout(DEFAULT_ERROR_TOAST_MS + 2500);
      await expect(t).toBeHidden();
    });

    // ── c. permiso ─────────────────────────────────────────────────────────
    await runStep("c · 400 permiso", async () => {
      const antes = await editarYGuardar("permiso");
      await expect(toast(PERMISO)).toBeVisible();
      await expectSinScrollNiFoco(antes);
      await expectNoGuardado();
    });

    // ── d. 409 factura_detalle_ligado ──────────────────────────────────────
    await runStep("d · 409 factura_detalle_ligado muestra la lista de bloqueos", async () => {
      await editarYGuardar("409");
      await expect(page.getByText("Renglones de factura ligados")).toBeVisible();
      await expect(page.getByText(ACCION_FACTURA_DETALLE)).toBeVisible();
      await expect(guardar).toHaveCount(0);
      await expect(toasts.filter({ hasText: /documentos ligados|No se pudo/ })).toHaveCount(0);
      await shot(page, "pedido-mesa-control-rejection-d-409.png");
    });
  } finally {
    // Nada queda retenido: todos los handlers responden o abortan al momento.
    await page.unrouteAll({ behavior: "wait" });
  }

  console.log("\n── Resumen ──");
  for (const r of results) console.log(`  ${r.status}  ${r.step}${r.note ? ` — ${r.note}` : ""}`);
  console.log(`  Guardados simulados: ${guardados.join(", ") || "(ninguno)"}`);
  console.log(`  Escrituras abortadas: ${escriturasAbortadas.join(", ") || "(ninguna)"}`);
  expect(guardados).toEqual(["servicios-varios", "servicios-uno", "permiso", "409"]);
  expect(results.filter((r) => r.status === "FAIL"), "pasos fallidos").toEqual([]);
});
