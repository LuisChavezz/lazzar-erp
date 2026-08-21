import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual del monitor de lecturas RFID (`/wms/rfid-scanner`).
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `ob-ficha-e2e.spec.ts`.
 *
 * ⚠ La prueba 12 es DESTRUCTIVA Y REAL: `POST /wms/etiquetas-rfid/scans/clear/`
 * hace `RfidScan.objects.all().delete()` en el backend —sin filtro por empresa,
 * sucursal ni fecha—, así que borra TODAS las lecturas del ERP, no solo las de
 * quien ejecuta la prueba, y no hay forma de revertirlo.
 *
 * Por eso la purga es OPT-IN (`RUN_PURGE=1`) y no opt-out: `npm run e2e` sin
 * argumentos recoge TODOS los specs de `tests/`, así que un opt-out convertiría
 * el comando de siempre —el que se usaba para la ficha de la OB— en uno que
 * además vacía la tabla de lecturas de producción, sin que quien lo teclea
 * tenga por qué saber que este archivo existe. Con el opt-in, el comando de
 * siempre sigue haciendo exactamente lo que hacía.
 *
 * Variables de entorno:
 *   BASE_URL    URL del frontend (default `http://localhost:3000`)
 *   RUN_PURGE   `1` para EJECUTAR la purga irreversible (pruebas 12-13).
 *               Sin ella, las pruebas 12-13 se marcan como SKIP.
 */

const SHOTS = "tests/screenshots";
const RUN_PURGE = process.env.RUN_PURGE === "1";

/** Umbral de "sin señal" del backend, replicado en `RfidScannerStats`. */
const OFFLINE_THRESHOLD_SECONDS = 300;

/** Cadencia del polling (`RFID_SCANS_POLL_INTERVAL_MS`), en ms. */
const POLL_INTERVAL_MS = 3_000;
/** Ventana de observación: más de un ciclo completo, con holgura. */
const POLL_WINDOW_MS = 4_500;

/**
 * El GET del listado en vivo. Se excluye `/clear` a propósito: la purga cuelga
 * de la MISMA raíz (`/scans/clear/`) y solo se distingue por el método, así que
 * un `includes("/scans/")` a secas contaría la purga como si fuera un sondeo.
 * `scanner-stats` no interfiere: es otra ruta (`/scanner-stats/`).
 */
const isScansPoll = (url: string, method: string) =>
  url.includes("/etiquetas-rfid/scans/") && !url.includes("/clear") && method === "GET";

const SCANS_CLEAR = { urlPart: "/etiquetas-rfid/scans/clear/", method: "POST" };

// ── Utilidades ───────────────────────────────────────────────────────────────

type StepStatus = "PASS" | "FAIL" | "SKIP";
const results: { step: string; status: StepStatus; note?: string }[] = [];

/**
 * Ejecuta un bloque y REGISTRA su resultado sin abortar el resto. Las
 * comprobaciones de dentro usan `expect.soft`, que acumula fallos sin lanzar;
 * este `try/catch` cubre lo otro —un selector que no aparece, una acción que
 * revienta— para que un paso roto no se lleve por delante los siguientes.
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

function skipStep(name: string, note: string) {
  results.push({ step: name, status: "SKIP", note });
  console.log(`\n⏭ ${name} — ${note}`);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  console.log(`  📸 ${name}`);
}

/**
 * Filas de DATOS de la tabla. El estado vacío de `DataTable` NO es la ausencia
 * de `<tr>`: es un `<tr>` con una sola celda `colspan` que lleva el mensaje
 * (ver `DataTable.tsx`, rama `visibleRows.length > 0 ? … : …`). Contar
 * `tbody tr` a secas daría 1 con la tabla vacía, que es justo lo contrario de
 * lo que la prueba 12 quiere comprobar.
 */
function dataRows(page: Page): Locator {
  return page.locator("table tbody tr").filter({ hasNot: page.locator("td[colspan]") });
}

/**
 * Índice (1-based, para `nth-child`) de cada columna por su encabezado.
 *
 * Se construye en tiempo de ejecución en vez de dar por hecho el orden del
 * código: `DataTable` permite reordenar y ocultar columnas, y guarda ese estado
 * —así que una sesión previa puede haber dejado la tabla en otro orden—.
 * `innerText` devuelve el texto TAL COMO SE PINTA, y el `<tr>` de encabezados
 * lleva `uppercase`, de ahí que las llaves vengan en mayúsculas.
 */
async function headerIndex(page: Page): Promise<Map<string, number>> {
  const headers = await page.locator("table thead th").allInnerTexts();
  const map = new Map<string, number>();
  headers.forEach((text, i) => {
    const key = text.trim().toUpperCase();
    if (key && !map.has(key)) map.set(key, i + 1);
  });
  return map;
}

/** Celda de una fila por nombre de columna. */
function cell(row: Locator, columns: Map<string, number>, column: string): Locator {
  const index = columns.get(column.toUpperCase());
  if (!index) throw new Error(`No existe la columna "${column}" en la tabla`);
  return row.locator(`td:nth-child(${index})`);
}

/** Texto de una celda, ya recortado. */
async function cellText(
  row: Locator,
  columns: Map<string, number>,
  column: string,
): Promise<string> {
  return (await cell(row, columns, column).innerText()).trim();
}

/** El interruptor de monitoreo, esté en el estado que esté. */
function monitorToggle(page: Page): Locator {
  return page.getByRole("button", { name: /Iniciar monitoreo|Detener monitoreo/ });
}

/** ¿El polling está encendido ahora mismo? (lo delata la etiqueta del botón). */
async function isMonitoring(page: Page): Promise<boolean> {
  return (await monitorToggle(page).innerText()).includes("Detener");
}

/**
 * Deja el monitoreo en el estado pedido. Hace falta porque la vista arranca
 * SONDEANDO (`useState(true)` en `RfidScannerView`): sin esto, "pulsar Iniciar
 * monitoreo" no tendría botón que pulsar en la primera prueba.
 */
async function setMonitoring(page: Page, on: boolean) {
  if ((await isMonitoring(page)) === on) return;
  await monitorToggle(page).click();
  await expect(monitorToggle(page)).toHaveText(on ? /Detener monitoreo/ : /Iniciar monitoreo/);
}

/**
 * Cuenta los sondeos al listado durante `windowMs`. El escucha se registra
 * ANTES de esperar, y `page.on("request")` solo ve peticiones NUEVAS: una que
 * ya estuviera en vuelo no se cuenta, que es justo lo que interesa al comprobar
 * que el ciclo se detuvo.
 */
async function countPollsDuring(page: Page, windowMs: number): Promise<number> {
  let count = 0;
  const listener = (request: { url: () => string; method: () => string }) => {
    if (isScansPoll(request.url(), request.method())) count += 1;
  };
  page.on("request", listener);
  await page.waitForTimeout(windowMs);
  page.off("request", listener);
  return count;
}

/** La barra de estado del lector: el primer hijo de la vista. */
function statsBar(page: Page): Locator {
  return page
    .locator("div.space-y-6 > div")
    .filter({ hasText: /lecturas en base|Lector|Estado del lector/i })
    .first();
}

/** Total de lecturas que anuncia la barra ("413 lecturas en base" → 413). */
async function readScanCount(page: Page): Promise<number | null> {
  const label = page.getByText("lecturas en base");
  if (!(await label.isVisible().catch(() => false))) return null;
  const text = await label.locator("xpath=preceding-sibling::span[1]").innerText();
  const value = Number(text.replace(/[^\d-]/g, ""));
  return Number.isFinite(value) ? value : null;
}

// ── Suite ────────────────────────────────────────────────────────────────────

test("Monitor de lecturas RFID — verificación completa", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  let columns = new Map<string, number>();
  /** El usuario ve "Limpiar lecturas" (rol admin). Gatea las pruebas 10-13. */
  let canPurge = false;
  /** La purga llegó a ejecutarse. Gatea la prueba 13. */
  let purged = false;
  /**
   * ¿La tabla trajo filas al cargar? Solo se usa como GATE de las pruebas que
   * necesitan datos. NO sirve como referencia para comparar conteos más
   * adelante: se toma con el monitoreo encendido, así que cualquier lectura que
   * llegue después lo deja obsoleto. Las pruebas que comparan releen el conteo
   * en el momento, ya con el ciclo detenido.
   */
  let filasIniciales = 0;

  // ── Login manual ──────────────────────────────────────────────────────────
  await runStep("Login manual (pausa)", async () => {
    await page.goto("/auth/login");
    console.log(`
  ┌──────────────────────────────────────────────────────────────┐
  │  PAUSA — entra a mano en la ventana del navegador:           │
  │    1. Captura usuario y contraseña (y MFA si aplica).        │
  │    2. Si te manda a /select-branch, elige empresa/sucursal.  │
  │    3. Pulsa ▶ "Resume" en el Playwright Inspector.           │
  └──────────────────────────────────────────────────────────────┘`);
    await page.pause();

    // Tras el resume: cualquier ruta sirve mientras NO sea login ni la
    // selección de sucursal — `proxy.ts` reenvía ahí a quien no tenga sesión o
    // workspace, así que seguir en ellas significa login incompleto.
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page).not.toHaveURL(/\/select-branch/);
    console.log(`  Sesión iniciada — URL actual: ${page.url()}`);
  });

  // ── Test 1: navegar al módulo ─────────────────────────────────────────────
  await runStep("Test 1 · Abrir Scanner RFID", async () => {
    await page.goto("/wms/rfid-scanner");
    await expect(page).toHaveURL(/\/wms\/rfid-scanner$/);

    await expect
      .soft(page.getByText(/Monitor en vivo del lector RFID/))
      .toBeVisible({ timeout: 60_000 });

    // El interruptor arranca en "Detener monitoreo": la vista entra sondeando
    // a propósito (ver `RfidScannerView`). Se acepta cualquiera de los dos
    // rótulos y se deja constancia de con cuál se encontró.
    await expect(monitorToggle(page)).toBeVisible({ timeout: 60_000 });
    const rotulo = (await monitorToggle(page).innerText()).trim();
    console.log(`  Interruptor de monitoreo al cargar: "${rotulo}"`);
    expect.soft(rotulo).toMatch(/Iniciar monitoreo|Detener monitoreo/);

    await expect.soft(page.getByRole("button", { name: "Actualizar datos" })).toBeVisible();
    await shot(page, "01-scanner-page-loaded.png");
  });

  // ── Test 2: barra de estado del lector ────────────────────────────────────
  await runStep("Test 2 · Barra de estado del lector", async () => {
    const barra = statsBar(page);
    await expect.soft(barra).toBeVisible();

    // Los tres estados son legítimos según el lector real: conectado, sin señal
    // o desconocido (si `scanner-stats` falló o sigue en vuelo).
    const texto = (await barra.innerText()).replace(/\s+/g, " ").trim();
    console.log(`  Barra: "${texto}"`);
    expect
      .soft(texto)
      .toMatch(
        /Lector conectado|Lector sin señal|Estado del lector desconocido|Consultando estado del lector/,
      );

    const conectado = texto.includes("Lector conectado");
    const total = await readScanCount(page);
    console.log(`  Estado: ${conectado ? "CONECTADO" : "sin señal/desconocido"} · lecturas en base: ${total}`);

    // "N lecturas en base" solo aparece cuando `scanner-stats` respondió.
    if (total === null) {
      console.log("  ⚠ La barra no muestra el conteo: scanner-stats no respondió.");
    } else {
      await expect.soft(page.getByText("lecturas en base")).toBeVisible();
      expect.soft(total).toBeGreaterThanOrEqual(0);
    }

    // "Última lectura hace ..." solo se pinta con `last_scan_seconds_ago` no
    // nulo, que es siempre el caso cuando el estado es "conectado" (el umbral
    // de 300 s se evalúa sobre ese mismo valor).
    if (conectado) {
      await expect.soft(page.getByText("Última lectura")).toBeVisible();
      expect.soft(texto).toMatch(/hace \d+ (s|min|h|d)/);
      console.log(`  Antigüedad de la última lectura por debajo de ${OFFLINE_THRESHOLD_SECONDS} s`);
    }

    await shot(page, "02-scanner-stats-bar.png");
  });

  // ── Test 3: estructura de la tabla ────────────────────────────────────────
  await runStep("Test 3 · Columnas de la tabla", async () => {
    await expect.soft(page.locator("table")).toBeVisible();

    columns = await headerIndex(page);
    console.log(`  Columnas: ${[...columns.keys()].join(" | ")}`);
    for (const columna of [
      "MATCH",
      "EPC",
      "SKU",
      "COLOR",
      "TALLA",
      "FOLIO",
      "ANTENA",
      "RSSI",
      "HORA",
    ]) {
      expect.soft([...columns.keys()]).toContain(columna);
    }

    filasIniciales = await dataRows(page).count();
    console.log(`  Filas visibles (página 1): ${filasIniciales}`);
    expect.soft(filasIniciales).toBeGreaterThan(0);

    await shot(page, "03-table-columns.png");
  });

  // ── Test 4: contenido de una lectura ──────────────────────────────────────
  if (filasIniciales === 0) {
    skipStep("Test 4 · Contenido de la primera lectura", "la tabla no trajo ninguna fila");
  } else {
    await runStep("Test 4 · Contenido de la primera lectura", async () => {
      const fila = dataRows(page).first();

      // El EPC se lee del `title` y no del texto pintado: la celda va con
      // `truncate`, y el atributo lleva el valor íntegro.
      const epc = (await cell(fila, columns, "EPC").locator("span").getAttribute("title")) ?? "";
      console.log(`  EPC: ${epc}`);
      expect.soft(epc).toMatch(/^[0-9a-fA-F]+$/);

      const hora = await cellText(fila, columns, "HORA");
      console.log(`  Hora: ${hora}`);
      expect.soft(hora).toMatch(/^\d{2}:\d{2}:\d{2}$/);

      // El icono de match lleva `aria-label` propio (ver `RfidScanColumns`).
      const conMatch = await cell(fila, columns, "MATCH")
        .locator('svg[aria-label="Con match"]')
        .count();
      const sinMatch = await cell(fila, columns, "MATCH")
        .locator('svg[aria-label="Sin match"]')
        .count();
      expect.soft(conMatch + sinMatch).toBe(1);

      const sku = await cellText(fila, columns, "SKU");
      const color = await cellText(fila, columns, "COLOR");
      const talla = await cellText(fila, columns, "TALLA");
      const folio = await cellText(fila, columns, "FOLIO");
      console.log(
        `  Match: ${conMatch ? "SÍ" : "NO"} · SKU=${sku} Color=${color} Talla=${talla} Folio=${folio}`,
      );

      if (conMatch) {
        // Con match, el ÚNICO campo garantizado es el folio: el backend rellena
        // sku/color/talla desde `producto_variante`, y una impresión hecha por
        // PRODUCTO (sin variante) los deja nulos —"—" ahí es correcto, no un
        // fallo—. Ver la rama `if variante:` de `EtiquetaRFIDViewSet.scans`.
        expect.soft(folio).not.toBe("—");
        if ([sku, color, talla].includes("—")) {
          console.log("  ⚠ Match sin variante: sku/color/talla vacíos es lo esperado aquí.");
        }
      } else {
        // Sin match el backend NO manda esos campos, así que los cuatro deben
        // caer al guion.
        for (const [nombre, valor] of [
          ["SKU", sku],
          ["Color", color],
          ["Talla", talla],
          ["Folio", folio],
        ] as const) {
          expect.soft(valor, `${nombre} debe ser "—" en una lectura sin match`).toBe("—");
        }
      }

      await shot(page, "04-scan-row-detail.png");
    });
  }

  // ── Test 5: arrancar el polling ───────────────────────────────────────────
  await runStep("Test 5 · Iniciar monitoreo", async () => {
    // La vista arranca sondeando, así que primero se detiene: solo así hay un
    // botón "Iniciar monitoreo" que pulsar y una transición que observar.
    await setMonitoring(page, false);
    await expect(monitorToggle(page)).toHaveText(/Iniciar monitoreo/);

    const sondeo = page.waitForResponse(
      (response) => isScansPoll(response.url(), response.request().method()),
      { timeout: POLL_WINDOW_MS },
    );
    await page.getByRole("button", { name: "Iniciar monitoreo" }).click();
    await expect(monitorToggle(page)).toHaveText(/Detener monitoreo/);

    const respuesta = await sondeo;
    console.log(`  ↪ GET ${respuesta.status()} ${new URL(respuesta.url()).pathname}`);
    expect.soft(respuesta.status()).toBe(200);

    // Y sigue sondeando: en una ventana de 4.5 s debe caber al menos un ciclo
    // más de los de 3 s.
    const sondeos = await countPollsDuring(page, POLL_WINDOW_MS);
    console.log(`  Sondeos en ${POLL_WINDOW_MS} ms: ${sondeos} (intervalo ${POLL_INTERVAL_MS} ms)`);
    expect.soft(sondeos).toBeGreaterThanOrEqual(1);

    await shot(page, "05-monitoring-active.png");
  });

  // ── Test 6: detener el polling ────────────────────────────────────────────
  await runStep("Test 6 · Detener monitoreo", async () => {
    await setMonitoring(page, true);
    await page.getByRole("button", { name: "Detener monitoreo" }).click();
    await expect(monitorToggle(page)).toHaveText(/Iniciar monitoreo/);

    const sondeos = await countPollsDuring(page, POLL_WINDOW_MS);
    console.log(`  Sondeos tras detener, en ${POLL_WINDOW_MS} ms: ${sondeos} (se esperan 0)`);
    expect.soft(sondeos, "el ciclo debe quedar detenido").toBe(0);

    await shot(page, "06-monitoring-stopped.png");
  });

  // ── Test 7: búsqueda global ───────────────────────────────────────────────
  if (filasIniciales === 0) {
    skipStep("Test 7 · Búsqueda en la tabla", "no hay filas sobre las que filtrar");
  } else {
    await runStep("Test 7 · Búsqueda en la tabla", async () => {
      // Conteo RELEÍDO aquí, no el de la prueba 3: aquel se tomó con el
      // monitoreo encendido y las lecturas que llegaron durante las pruebas 5-6
      // ya lo dejaron obsoleto. Ahora el ciclo está detenido (prueba 6), así que
      // este número no se mueve mientras dure la prueba.
      const filasAntes = await dataRows(page).count();

      // La caja de búsqueda arranca PLEGADA (`isSearchExpanded = false`): hay
      // que abrirla con la lupa, igual que haría una persona.
      const lupa = page.getByRole("button", { name: "Buscar" });
      if (await lupa.isVisible().catch(() => false)) await lupa.click();

      const caja = page.getByRole("searchbox", { name: /Buscar EPC/ });
      await expect(caja).toBeVisible();

      const epc =
        (await cell(dataRows(page).first(), columns, "EPC")
          .locator("span")
          .getAttribute("title")) ?? "";
      // Un fragmento del centro del EPC: suficientemente específico para
      // filtrar y suficientemente corto para que sobreviva a un dato distinto.
      const fragmento = epc.slice(4, 12);
      console.log(`  Filtrando por "${fragmento}" (de ${epc})`);

      await caja.fill(fragmento);
      await expect.poll(async () => dataRows(page).count()).toBeGreaterThan(0);
      const filtradas = await dataRows(page).count();
      console.log(`  Filas tras filtrar: ${filtradas} (antes ${filasAntes})`);
      expect.soft(filtradas).toBeLessThanOrEqual(filasAntes);

      // Toda fila superviviente debe contener el fragmento en su EPC.
      const epcsVisibles = await cell(dataRows(page), columns, "EPC")
        .locator("span")
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("title") ?? ""));
      for (const visible of epcsVisibles) {
        expect.soft(visible.toLowerCase()).toContain(fragmento.toLowerCase());
      }
      await shot(page, "07-table-search.png");

      await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
      await expect.poll(async () => dataRows(page).count()).toBe(filasAntes);
      console.log(`  Búsqueda limpiada — vuelven ${filasAntes} filas`);
    });
  }

  // ── Test 8: paginación ────────────────────────────────────────────────────
  if (filasIniciales === 0) {
    skipStep("Test 8 · Paginación", "no hay filas que paginar");
  } else {
    await runStep("Test 8 · Paginación", async () => {
      const indicador = page.getByText(/Mostrando \d+-\d+ de \d+/);
      await expect.soft(indicador).toBeVisible();
      const antes = (await indicador.innerText()).trim();
      console.log(`  ${antes}`);

      // Conteo de la página actual releído aquí, por lo mismo que en la prueba 7.
      const total = Number(antes.match(/de (\d+)/)?.[1] ?? 0);
      if (total <= (await dataRows(page).count())) {
        console.log(`  Solo hay ${total} lecturas: no hay segunda página que visitar.`);
        await shot(page, "08-pagination.png");
        return;
      }

      const primeroPagina1 =
        (await cell(dataRows(page).first(), columns, "EPC")
          .locator("span")
          .getAttribute("title")) ?? "";

      await page.getByRole("button", { name: "Página siguiente" }).click();
      await expect.poll(async () => (await indicador.innerText()).trim()).not.toBe(antes);
      const despues = (await indicador.innerText()).trim();
      console.log(`  Página 2 → ${despues}`);

      const primeroPagina2 =
        (await cell(dataRows(page).first(), columns, "EPC")
          .locator("span")
          .getAttribute("title")) ?? "";
      expect.soft(primeroPagina2).not.toBe(primeroPagina1);
      await shot(page, "08-pagination.png");

      await page.getByRole("button", { name: "Página anterior" }).click();
      await expect.poll(async () => (await indicador.innerText()).trim()).toBe(antes);
      console.log("  De vuelta en la página 1");
    });
  }

  // ── Test 9: visibilidad del botón de purga (gate de admin) ────────────────
  await runStep("Test 9 · Visibilidad de \"Limpiar lecturas\" (gate de admin)", async () => {
    const boton = page.getByRole("button", { name: /Limpiar lecturas|Limpiando/ });
    canPurge = await boton.isVisible().catch(() => false);

    if (canPurge) {
      console.log("  El botón de purga ESTÁ visible → la sesión tiene rol admin.");
    } else {
      console.log("  El botón de purga NO está visible → la sesión no es admin.");
      console.log("  (El gate es solo UX: la frontera real es el 403 del backend.)");
      await shot(page, "09-purge-not-visible-non-admin.png");
    }
  });

  // ── Test 10: diálogo de confirmación ──────────────────────────────────────
  if (!canPurge) {
    skipStep("Test 10 · Diálogo de confirmación de la purga", "la sesión no ve el botón");
  } else {
    await runStep("Test 10 · Diálogo de confirmación de la purga", async () => {
      await page.getByRole("button", { name: "Limpiar lecturas" }).click();

      const dialogo = page.getByRole("dialog");
      await expect.soft(dialogo).toBeVisible();
      await expect.soft(dialogo).toContainText("Limpiar lecturas RFID");

      const texto = (await dialogo.innerText()).replace(/\s+/g, " ").trim();
      console.log(`  Diálogo: "${texto}"`);
      // La advertencia debe decir que el borrado es TOTAL e irreversible.
      expect.soft(texto).toMatch(/todas las lecturas/i);
      expect.soft(texto).toMatch(/no se puede deshacer/i);
      await expect.soft(dialogo.getByRole("button", { name: "Cancelar" })).toBeVisible();
      await expect.soft(dialogo.getByRole("button", { name: "Eliminar" })).toBeVisible();

      await shot(page, "10-purge-confirmation-dialog.png");
    });
  }

  // ── Test 11: cancelar la purga ────────────────────────────────────────────
  if (!canPurge) {
    skipStep("Test 11 · Cancelar la purga", "la sesión no ve el botón");
  } else {
    await runStep("Test 11 · Cancelar la purga", async () => {
      // Conteo tomado JUSTO ANTES de cancelar, no el de la prueba 3: lo que se
      // comprueba es que cancelar no borre nada, y para eso la referencia tiene
      // que ser el estado inmediatamente anterior al clic.
      const filasAntes = await dataRows(page).count();

      const dialogo = page.getByRole("dialog");
      if (!(await dialogo.isVisible().catch(() => false))) {
        await page.getByRole("button", { name: "Limpiar lecturas" }).click();
        await expect(dialogo).toBeVisible();
      }

      // Se vigila que cancelar NO dispare la mutación: si saliera un POST, el
      // botón de cancelar estaría cableado al `onConfirm`.
      let postsDePurga = 0;
      const listener = (request: { url: () => string; method: () => string }) => {
        if (request.url().includes(SCANS_CLEAR.urlPart) && request.method() === "POST") {
          postsDePurga += 1;
        }
      };
      page.on("request", listener);

      await dialogo.getByRole("button", { name: "Cancelar" }).click();
      await expect(dialogo).toBeHidden();
      await page.waitForTimeout(1_000);
      page.off("request", listener);

      expect.soft(postsDePurga, "cancelar no debe llamar al endpoint").toBe(0);
      const filas = await dataRows(page).count();
      console.log(`  Diálogo cerrado sin borrar · filas intactas: ${filas}`);
      expect.soft(filas).toBe(filasAntes);

      await shot(page, "11-purge-cancelled.png");
    });
  }

  // ── Test 12: ejecutar la purga (DESTRUCTIVO) ──────────────────────────────
  if (!canPurge) {
    skipStep("Test 12 · Ejecutar la purga", "la sesión no ve el botón");
  } else if (!RUN_PURGE) {
    skipStep(
      "Test 12 · Ejecutar la purga",
      "es opt-in: relanza con RUN_PURGE=1 para ejecutarla",
    );
  } else {
    await runStep("Test 12 · Ejecutar la purga (DESTRUCTIVO)", async () => {
      const totalAntes = await readScanCount(page);
      console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║  ⚠  ACCIÓN DESTRUCTIVA E IRREVERSIBLE                        ║
  ║  POST /wms/etiquetas-rfid/scans/clear/ borra la tabla        ║
  ║  RfidScan COMPLETA: todas las empresas, todas las fechas.    ║
  ║  Lecturas en base ahora mismo: ${String(totalAntes ?? "?").padEnd(28)}║
  ║  Se ejecuta porque se pasó RUN_PURGE=1.                      ║
  ╚══════════════════════════════════════════════════════════════╝`);

      await page.getByRole("button", { name: "Limpiar lecturas" }).click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toBeVisible();

      // El escucha se registra ANTES del clic: una respuesta rápida llegaría
      // antes que el escucha y la espera se colgaría.
      const pendiente = page.waitForResponse(
        (response) =>
          response.url().includes(SCANS_CLEAR.urlPart) &&
          response.request().method() === SCANS_CLEAR.method,
        { timeout: 30_000 },
      );
      await dialogo.getByRole("button", { name: "Eliminar" }).click();
      const respuesta = await pendiente;
      console.log(`  ↪ POST ${respuesta.status()} ${new URL(respuesta.url()).pathname}`);
      expect.soft(respuesta.status()).toBe(200);
      purged = respuesta.status() === 200;

      const cuerpo = await respuesta.json().catch(() => null);
      console.log(`  Respuesta: ${JSON.stringify(cuerpo)}`);

      // Toast de éxito con el conteo ("N lecturas eliminadas.").
      await expect
        .soft(page.getByText(/lecturas? eliminadas?\./))
        .toBeVisible({ timeout: 15_000 });

      // La tabla debe quedar VACÍA: cero filas de datos y el mensaje de vacío
      // en su lugar (el `<tr>` con `colspan` no cuenta como fila).
      await expect.poll(async () => dataRows(page).count(), { timeout: 15_000 }).toBe(0);
      await expect
        .soft(page.getByText(/Sin lecturas todavía|Monitoreo detenido/))
        .toBeVisible();

      // Y la barra debe reflejarlo: `scanner-stats` se invalida en el mismo
      // `onSuccess`, así que el conteo cae a 0 y el semáforo a "sin señal"
      // (`last_scan_seconds_ago` pasa a null al no quedar lecturas).
      await expect.poll(async () => readScanCount(page), { timeout: 15_000 }).toBe(0);
      const barra = (await statsBar(page).innerText()).replace(/\s+/g, " ").trim();
      console.log(`  Barra tras la purga: "${barra}"`);
      expect.soft(barra).toMatch(/Lector sin señal/);

      await shot(page, "12-purge-executed.png");
      results.push({
        step: "Test 12 · limpieza",
        status: "SKIP",
        note: "no hay restauración posible: el borrado de RfidScan es irreversible",
      });
    });
  }

  // ── Test 13: monitoreo después de la purga ────────────────────────────────
  if (!purged) {
    skipStep(
      "Test 13 · Monitoreo tras la purga",
      RUN_PURGE ? "la purga no llegó a ejecutarse" : "sin RUN_PURGE=1 no hubo purga que verificar",
    );
  } else {
    await runStep("Test 13 · Monitoreo tras la purga", async () => {
      await setMonitoring(page, true);
      await expect(monitorToggle(page)).toHaveText(/Detener monitoreo/);

      // Dos ventanas de sondeo. Si el FX sigue leyendo, las filas reaparecen; si
      // no hay nadie pasando etiquetas, la tabla se queda vacía. Ambas cosas son
      // correctas: lo que se comprueba es que el ciclo sigue vivo tras la purga.
      const sondeos = await countPollsDuring(page, POLL_WINDOW_MS + POLL_INTERVAL_MS);
      const filas = await dataRows(page).count();
      console.log(`  Sondeos tras la purga: ${sondeos} · filas nuevas: ${filas}`);
      expect.soft(sondeos, "el ciclo debe seguir vivo tras la purga").toBeGreaterThanOrEqual(1);
      if (filas > 0) {
        console.log("  El lector FX está leyendo AHORA: la tabla se repobló sola.");
      } else {
        console.log("  Ninguna lectura nueva: el FX no está recibiendo etiquetas en este momento.");
      }

      await setMonitoring(page, false);
      await shot(page, "13-post-purge-monitoring.png");
    });
  }

  // ── Cierre ────────────────────────────────────────────────────────────────
  await shot(page, "14-final-state.png");

  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log("RESUMEN — Scanner RFID (/wms/rfid-scanner)");
  console.log("═".repeat(ancho + 30));
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

  // `runStep` traga lo que se lanza para que un paso roto no impida los
  // siguientes, pero eso haría que Playwright diera el test por bueno (exit 0)
  // mientras el resumen imprime FAIL. Esta aserción —dura, y al final, ya
  // impreso el resumen— traslada el resultado real al código de salida.
  expect(
    fallidos.length,
    `Pasos fallidos: ${fallidos.map((r) => r.step).join(", ")}`,
  ).toBe(0);
});
