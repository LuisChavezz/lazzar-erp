import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual de la ficha de taller de una Orden de Bordado
 * (`/wms/embroidery/[id]`), construida en las fases 1-4.
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector.
 *
 * Las mutaciones pegan al backend REAL, así que cada prueba deja las cosas como
 * estaban — el cambio de estatus incluido: desde el rediseño del enum las
 * transiciones son libres entre estatus no terminales, así que la prueba salta
 * a otro estatus y vuelve al de partida. (Antes no podía: eran solo hacia
 * adelante, y por eso figuraba como la excepción de esta regla.) Para saltarse
 * el paso de todos modos, `SKIP_STATUS_TEST=1`.
 *
 * Variables de entorno:
 *   BASE_URL         URL del frontend (default `http://localhost:3000`)
 *   OB_ID            Fuerza una OB concreta en vez de elegirla del listado
 *   SKIP_STATUS_TEST `1` para no ejecutar la transición irreversible
 */

const SHOTS = "tests/screenshots";
const SKIP_STATUS_TEST = process.env.SKIP_STATUS_TEST === "1";
const OB_ID = process.env.OB_ID;

/**
 * Estatus terminales: la ficha se vuelve de solo lectura (ver
 * `isTerminalStatus`). Son los códigos 7 y 8 del enum reescrito; las etiquetas
 * viejas ("Completado"/"Cancelado") ya no existen y sus enteros significan hoy
 * otra cosa.
 */
const TERMINAL_LABELS = ["Finalizado", "Cancelado (legacy)"];

// ── Utilidades ───────────────────────────────────────────────────────────────

type StepStatus = "PASS" | "FAIL" | "SKIP";
const results: { step: string; status: StepStatus; note?: string }[] = [];

/**
 * Ejecuta un bloque y REGISTRA su resultado sin abortar el resto. Las
 * comprobaciones de dentro usan `expect.soft`, que acumula fallos sin lanzar;
 * este `try/catch` cubre lo otro —un selector que no aparece, una acción que
 * revienta— para que un paso roto no se lleve por delante la limpieza de datos
 * de los pasos siguientes.
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
 * Número desde un texto formateado en es-MX ("1,234.5" → 1234.5). La coma es
 * separador de MILES en este locale, así que se elimina antes de convertir.
 */
function parseEsNumber(text: string): number | null {
  const match = text.replace(/\s/g, "").match(/-?[\d.,]+/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** `GET` del detalle de la OB — el re-fetch que dispara cada mutación. */
const OB_DETAIL_GET = /\/produccion\/orden-bordado\/\d+\/$/;
const OB_PATCH = { urlPart: "/produccion/orden-bordado/", method: "PATCH" };

/**
 * Espera la respuesta de una mutación disparada por `action` y, opcionalmente,
 * el `GET` de re-fetch que la sigue.
 *
 * Los DOS escuchas se registran ANTES de `action()`: si se registraran después,
 * una respuesta rápida llegaría antes que el escucha y la espera colgaría.
 *
 * Esperar el re-fetch (`awaitRefetch`) NO es un lujo en los campos que guardan
 * en BLUR (`maquina_asignada`, `observaciones`). Esos componentes resincronizan
 * su borrador EN RENDER cuando cambia el valor del servidor:
 *
 *     if (value !== prevValue) { setPrevValue(value); setDraft(value ?? ""); }
 *
 * Si la prueba escribe el valor de limpieza MIENTRAS el re-fetch de la mutación
 * anterior sigue en vuelo, ese re-sync pisa lo tecleado. Al hacer blur, el
 * `commit` compara borrador contra servidor, los encuentra iguales y NO manda
 * PATCH — así que el `waitForResponse` de la limpieza esperaba un PATCH que
 * nunca iba a salir. De ahí los timeouts de las pruebas 5 y 7.
 */
async function waitForMutation(
  page: Page,
  action: () => Promise<void>,
  match: { urlPart: string; method: string },
  options: { awaitRefetch?: boolean } = {},
) {
  const pending = page.waitForResponse(
    (response) =>
      response.url().includes(match.urlPart) &&
      response.request().method() === match.method,
    { timeout: 30_000 },
  );
  const pendingRefetch = options.awaitRefetch
    ? page
        .waitForResponse(
          (response) =>
            OB_DETAIL_GET.test(response.url()) && response.request().method() === "GET",
          { timeout: 30_000 },
        )
        .catch(() => null)
    : null;

  await action();
  const response = await pending;
  console.log(`  ↪ ${match.method} ${response.status()} ${new URL(response.url()).pathname}`);

  if (pendingRefetch) {
    const refetch = await pendingRefetch;
    console.log(`  ↪ re-fetch ${refetch ? `GET ${refetch.status()}` : "(no llegó)"}`);
  }
  return response;
}

/**
 * Como `waitForMutation`, pero tolera que la mutación NO se dispare: los campos
 * de blur omiten el PATCH cuando el valor no cambió respecto al del servidor
 * (p. ej. restaurar "" sobre un campo que ya estaba vacío). Devuelve el estado
 * HTTP, o `null` si no hizo falta ninguna llamada.
 */
async function waitForOptionalMutation(
  page: Page,
  action: () => Promise<void>,
  match: { urlPart: string; method: string },
  waitMs = 6_000,
): Promise<number | null> {
  const pending = page
    .waitForResponse(
      (response) =>
        response.url().includes(match.urlPart) &&
        response.request().method() === match.method,
      { timeout: waitMs },
    )
    .catch(() => null);

  await action();
  const response = await pending;
  if (!response) {
    console.log(`  ↪ sin ${match.method}: el valor no cambió (nada que guardar)`);
    return null;
  }
  console.log(`  ↪ ${match.method} ${response.status()} ${new URL(response.url()).pathname}`);
  // El re-fetch que sigue debe aterrizar antes de seguir tocando el campo.
  await page
    .waitForResponse(
      (r) => OB_DETAIL_GET.test(r.url()) && r.request().method() === "GET",
      { timeout: 15_000 },
    )
    .catch(() => null);
  return response.status();
}

/**
 * Textos que ESTA suite escribe (en sus versiones actual e históricas). Si el
 * valor "original" de un campo coincide con uno, no es dato del negocio: es
 * basura que dejó una corrida anterior que no llegó a limpiar.
 */
const RESTOS_E2E = [
  /^Barudan (Test )?E2E\b/i,
  /^Observaciones E2E\b/i,
  /^Test E2E observaciones\b/i,
];

/**
 * Valor al que debe volver un campo tras la prueba. Normalmente es el que tenía
 * al empezar; si ese valor es un resto de una corrida previa, se restaura VACÍO
 * para no perpetuar la basura corrida tras corrida.
 */
function valorARestaurar(original: string): string {
  const esResto = RESTOS_E2E.some((patron) => patron.test(original.trim()));
  if (esResto) {
    console.log(`  ⚠ "${original}" es resto de una corrida previa → se limpia`);
  }
  return esResto ? "" : original;
}

/** Sección de la ficha, localizada por el `<h3>` de su título. */
function section(page: Page, title: string | RegExp): Locator {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title }) })
    .first();
}

/** Valor "hecho" de una tarjeta métrica del resumen ("12 / 60" → 12). */
async function readMetricDone(scope: Locator, label: string): Promise<number | null> {
  const value = scope
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::p[1]");
  const text = await value.innerText();
  return parseEsNumber(text.split("/")[0] ?? "");
}

// ── Suite ────────────────────────────────────────────────────────────────────

test("Ficha de taller de Orden de Bordado — verificación completa", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  /**
   * Sello único de ESTA corrida. Los campos que guardan en blur omiten el PATCH
   * cuando el valor no cambió, así que escribir una constante ("Barudan Test
   * E2E") fallaba en la segunda corrida: si la limpieza anterior no llegó a
   * completarse, el campo YA traía ese texto, el `commit` no veía cambio y la
   * espera del PATCH se colgaba. Con un sello por corrida el valor escrito es
   * siempre distinto del que hubiera, venga de donde venga.
   */
  const RUN_STAMP = Date.now();

  let obUrl = "";
  let obFolio = "";
  /** La ficha admite edición (estatus no terminal). Gatea las pruebas 4-11. */
  let editable = false;

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
    // selección de sucursal — el `proxy.ts` reenvía ahí a quien no tenga
    // sesión o workspace, así que seguir en ellas significa login incompleto.
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page).not.toHaveURL(/\/select-branch/);
    console.log(`  Sesión iniciada — URL actual: ${page.url()}`);
  });

  // ── Test 1: navegar del listado a la ficha ────────────────────────────────
  await runStep("Test 1 · Abrir la ficha desde el listado", async () => {
    if (OB_ID) {
      await page.goto(`/wms/embroidery/${OB_ID}`);
    } else {
      await page.goto("/wms/embroidery");

      // El folio de cada fila es un <button title="Ver detalle"> que hace
      // router.push a /wms/embroidery/[id] (ver EmbroideryView).
      const folios = page.getByTitle("Ver detalle");
      await expect(folios.first()).toBeVisible({ timeout: 60_000 });
      const total = await folios.count();
      console.log(`  Órdenes en el listado: ${total}`);

      // Se busca una OB NO terminal: en una completada/cancelada la ficha se
      // pinta en solo lectura y las pruebas 4-11 no tendrían nada que ejercer.
      const maxIntentos = Math.min(total, 5);
      for (let i = 0; i < maxIntentos; i += 1) {
        const folio = page.getByTitle("Ver detalle").nth(i);
        obFolio = (await folio.innerText()).trim();
        await folio.click();
        await expect(page).toHaveURL(/\/wms\/embroidery\/\d+$/);
        await expect(
          page.getByRole("heading", { name: "Información general" }),
        ).toBeVisible({ timeout: 30_000 });

        editable = await page
          .getByRole("button", { name: "Cambiar estatus de la orden" })
          .isVisible()
          .catch(() => false);

        if (editable) {
          console.log(`  OB elegida: ${obFolio} (editable)`);
          break;
        }
        console.log(`  ${obFolio} está en estatus terminal — probando la siguiente`);
        await page.goBack();
        await expect(page.getByTitle("Ver detalle").first()).toBeVisible();
      }
    }

    obUrl = page.url();
    await expect(page.getByRole("heading", { name: "Información general" })).toBeVisible();
    if (OB_ID) {
      editable = await page
        .getByRole("button", { name: "Cambiar estatus de la orden" })
        .isVisible()
        .catch(() => false);
    }
    console.log(`  Ficha: ${obUrl} · editable=${editable}`);
  });

  // ── Test 2: secciones y campos ────────────────────────────────────────────
  await runStep("Test 2 · Estructura de la página", async () => {
    for (const titulo of ["Información general", "Origen", "Resumen de avance"]) {
      await expect.soft(page.getByRole("heading", { name: titulo })).toBeVisible();
    }
    await expect
      .soft(page.getByRole("heading", { name: /Historial de avances/ }))
      .toBeVisible();

    // "Prioridad" ya NO figura: se retiró de la ficha (y del listado) al
    // quedarse sin `choices` en el modelo y llegar constante en todos los
    // registros. Su selector inline se borró con ella.
    const infoGeneral = section(page, "Información general");
    for (const campo of ["Pedido", "Estatus", "Máquina asignada", "Observaciones"]) {
      await expect.soft(infoGeneral.getByText(campo, { exact: true })).toBeVisible();
    }

    // Cobertura del pedido vive DENTRO de Origen desde el último reacomodo.
    const origen = section(page, "Origen");
    for (const campo of ["Empresa", "Sucursal", "Operador asignado"]) {
      await expect.soft(origen.getByText(campo, { exact: true })).toBeVisible();
    }
    await expect
      .soft(origen.getByRole("heading", { name: "Cobertura del pedido" }))
      .toBeVisible();

    // "Puntadas totales" sustituyó a "Puntadas realizadas": el avance registra
    // el ponchado por pieza y el backend multiplica por las piezas de la tanda.
    const resumen = section(page, "Resumen de avance");
    for (const rotulo of [
      "Piezas bordadas",
      "Puntadas totales",
      "Avance general",
      "Avance por talla",
    ]) {
      await expect.soft(resumen.getByText(rotulo, { exact: true })).toBeVisible();
    }

    await shot(page, "01-page-layout.png");
  });

  // ── Test 3: tabla "Avance por talla" ──────────────────────────────────────
  await runStep("Test 3 · Tabla Avance por talla", async () => {
    const resumen = section(page, "Resumen de avance");
    const tabla = resumen.locator("table").first();
    await expect.soft(tabla).toBeVisible();

    const encabezados = (await tabla.locator("thead th").allInnerTexts()).map((t) =>
      t.trim(),
    );
    console.log(`  Columnas: ${encabezados.join(" | ")}`);
    for (const columna of [
      "Talla / SKU",
      "Posición",
      "Programado",
      "Bordado",
      "Punt total",
      "% Avance",
      "Operadores",
    ]) {
      expect.soft(encabezados).toContain(columna);
    }

    const filas = tabla.locator("tbody tr");
    const totalFilas = await filas.count();
    console.log(`  Filas: ${totalFilas}`);
    expect.soft(totalFilas).toBeGreaterThan(0);

    // La celda de Posición (2ª columna) debe traer el disparador del popover
    // con la imagen del bordado, no texto plano. Es dato-dependiente: una
    // línea sin ubicaciones capturadas muestra "—" legítimamente.
    const disparadores = tabla.locator("tbody tr td:nth-child(2) button");
    const conPopover = await disparadores.count();
    console.log(`  Celdas de Posición con popover: ${conPopover}/${totalFilas}`);
    if (conPopover === 0) {
      console.log("  ⚠ Ninguna línea tiene ubicaciones capturadas — no se pudo");
      console.log("    verificar el popover con esta OB (no es un fallo de la UI).");
    } else {
      await disparadores.first().click();
      await expect.soft(page.getByRole("dialog").first()).toBeVisible();
      await shot(page, "02-avance-por-talla.png");
      await page.keyboard.press("Escape");
    }
    if (conPopover === 0) await shot(page, "02-avance-por-talla.png");
  });

  // ── Test 4: transición de estatus ─────────────────────────────────────────
  if (!editable) {
    skipStep("Test 4 · Transición de estatus", "la OB está en estatus terminal");
  } else {
    await runStep("Test 4 · Transición de estatus", async () => {
      const disparador = page.getByRole("button", { name: "Cambiar estatus de la orden" });
      const estatusOriginal = (await disparador.innerText()).trim();
      console.log(`  Estatus actual: ${estatusOriginal}`);

      await disparador.click();
      const opciones = page.getByRole("menuitem");
      await expect(opciones.first()).toBeVisible();
      const etiquetas = (await opciones.allInnerTexts()).map((t) => t.trim());
      console.log(`  Transiciones ofrecidas: ${etiquetas.join(", ")}`);
      await shot(page, "03-status-dropdown-open.png");

      // Las transiciones son libres desde cualquier estatus no terminal, con
      // dos exclusiones: el estatus ACTUAL (moverse a sí mismo no es una
      // transición) y el 8 "Cancelado (legacy)", que es la salida del enum
      // anterior y no un destino que se ofrezca hoy. De los 8 códigos quedan
      // por tanto 6 opciones, sea cual sea el estatus de partida.
      expect.soft(etiquetas.length).toBe(6);
      expect.soft(etiquetas).not.toContain(estatusOriginal);
      expect.soft(etiquetas).not.toContain("Cancelado (legacy)");

      if (SKIP_STATUS_TEST) {
        await page.keyboard.press("Escape");
        console.log("  SKIP_STATUS_TEST=1 → menú cerrado sin cambiar nada");
        return;
      }

      // Se elige la primera transición NO terminal: mandar la orden a
      // Finalizado o a Cancelado (legacy) la dejaría de solo lectura y sin nada
      // que ejercer en el resto de las pruebas.
      const destino =
        etiquetas.find((label) => !TERMINAL_LABELS.includes(label)) ?? etiquetas[0];
      console.log(`  Cambiando a "${destino}"`);

      await waitForMutation(
        page,
        async () => {
          await page.getByRole("menuitem", { name: destino, exact: true }).click();
        },
        OB_PATCH,
        { awaitRefetch: true },
      );

      await expect(disparador).toHaveText(new RegExp(destino));
      console.log(`  Estatus: ${estatusOriginal} → ${destino}`);
      await shot(page, "04-status-changed.png");

      // Limpieza: el estatus SÍ se restaura. Las opciones se listan por código
      // ascendente, así que "la primera no terminal" es la de código más bajo
      // —"Sin trabajar" para una OB que estaba bordándose—: sin devolverla, la
      // suite retrocedería una orden viva del taller a cada corrida. Desde el
      // rediseño del enum las transiciones son libres entre estatus no
      // terminales, así que volver es un PATCH más (antes no se podía, y de ahí
      // venía la excepción que documentaba la cabecera de este archivo).
      await disparador.click();
      await waitForMutation(
        page,
        async () => {
          await page
            .getByRole("menuitem", { name: estatusOriginal, exact: true })
            .click();
        },
        OB_PATCH,
        { awaitRefetch: true },
      );
      await expect.soft(disparador).toHaveText(new RegExp(estatusOriginal));
      console.log(`  Restaurado a "${estatusOriginal}"`);
    });
  }

  // ── Test 5: máquina asignada ──────────────────────────────────────────────
  if (!editable) {
    skipStep("Test 5 · Máquina asignada", "la OB está en estatus terminal");
  } else {
    await runStep("Test 5 · Máquina asignada", async () => {
      const campo = page.getByLabel("Máquina asignada");
      const original = await campo.inputValue();
      const valorPrueba = `Barudan E2E ${RUN_STAMP}`;
      console.log(`  Valor original: "${original}" → escribiendo "${valorPrueba}"`);

      // `awaitRefetch`: sin esperar el GET posterior, la limpieza de abajo
      // teclearía mientras el re-sync del componente aún puede pisar el
      // borrador (ver `waitForMutation`).
      await waitForMutation(
        page,
        async () => {
          await campo.fill(valorPrueba);
          await campo.press("Tab");
        },
        OB_PATCH,
        { awaitRefetch: true },
      );
      await expect.soft(campo).toHaveValue(valorPrueba);
      await shot(page, "05-machine-assigned.png");

      // Limpieza: restaurar el valor previo (vacío → el front manda null).
      const restaurar = valorARestaurar(original);
      const status = await waitForOptionalMutation(
        page,
        async () => {
          await campo.fill(restaurar);
          await campo.press("Tab");
        },
        OB_PATCH,
      );
      await expect.soft(campo).toHaveValue(restaurar);
      console.log(`  Restaurado a "${restaurar}"${status ? "" : " (sin PATCH)"}`);
    });
  }

  // ── Test 6: ELIMINADA ─────────────────────────────────────────────────────
  // Ejercía el selector inline de prioridad, que ya no existe: el campo se
  // retiró de la ficha y `EmbroideryPrioritySelect` se borró. La numeración de
  // las pruebas siguientes se conserva para no desalinearlas de sus capturas
  // (`07-…`, `08-…`), que se nombran por su paso.

  // ── Test 7: observaciones ─────────────────────────────────────────────────
  if (!editable) {
    skipStep("Test 7 · Observaciones", "la OB está en estatus terminal");
  } else {
    await runStep("Test 7 · Observaciones", async () => {
      const campo = page.getByLabel("Observaciones");
      const original = await campo.inputValue();
      const valorPrueba = `Observaciones E2E ${RUN_STAMP}`;
      console.log(`  Original: "${original}" → escribiendo "${valorPrueba}"`);

      // Mismo motivo que en la prueba 5: hay que dejar aterrizar el re-fetch
      // antes de teclear el valor de limpieza.
      await waitForMutation(
        page,
        async () => {
          await campo.fill(valorPrueba);
          await campo.press("Tab");
        },
        OB_PATCH,
        { awaitRefetch: true },
      );
      await expect.soft(campo).toHaveValue(valorPrueba);

      const restaurar = valorARestaurar(original);
      const status = await waitForOptionalMutation(
        page,
        async () => {
          await campo.fill(restaurar);
          await campo.press("Tab");
        },
        OB_PATCH,
      );
      await expect.soft(campo).toHaveValue(restaurar);
      console.log(`  Restaurado a "${restaurar}"${status ? "" : " (sin PATCH)"}`);
    });
  }

  // ── Tests 8-11: alta y baja de un avance ──────────────────────────────────
  const comentarioE2E = `E2E ${RUN_STAMP}`;
  let restante: number | null = null;
  let piezasAntes: number | null = null;
  let dialogoAbierto = false;

  if (!editable) {
    skipStep("Test 8 · Diálogo de avance", "la OB está en estatus terminal");
  } else {
    await runStep("Test 8 · Diálogo de avance (campos y contexto)", async () => {
      const historial = section(page, /Historial de avances/);
      const resumen = section(page, "Resumen de avance");
      piezasAntes = await readMetricDone(resumen, "Piezas bordadas");
      console.log(`  Piezas bordadas antes: ${piezasAntes}`);

      await historial.getByRole("button", { name: "Registrar avance" }).click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo).toBeVisible();
      dialogoAbierto = true;
      await shot(page, "07-avance-dialog-empty.png");

      // Sin renglón elegido, las cantidades están inhabilitadas.
      const numeros = dialogo.locator('input[type="number"]');
      await expect.soft(numeros.nth(0)).toBeDisabled();
      await expect.soft(numeros.nth(1)).toBeDisabled();

      // Se recorre el catálogo hasta dar con un renglón con saldo: en uno ya
      // completo el envío está bloqueado y no habría avance que registrar.
      const selector = dialogo.locator("select");
      const valores = (await selector.locator("option").evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLOptionElement).value),
      )).filter((value) => value !== "");
      console.log(`  Renglones disponibles: ${valores.length}`);

      for (const valor of valores) {
        await selector.selectOption(valor);
        const contexto = await dialogo.getByText(/Restante:/).innerText();
        restante = parseEsNumber(contexto.split("Restante:")[1] ?? "");
        console.log(`  Renglón ${valor} → ${contexto.replace(/\s+/g, " ").trim()}`);
        if (restante !== null && restante >= 1) break;
      }

      // Contexto completo bajo el selector.
      const contexto = await dialogo.getByText(/Restante:/).innerText();
      expect.soft(contexto).toMatch(/Programado:/);
      expect.soft(contexto).toMatch(/Bordado hasta ahora:/);
      expect.soft(contexto).toMatch(/Restante:/);

      // Con renglón elegido, las cantidades se habilitan.
      await expect.soft(numeros.nth(0)).toBeEnabled();
      await expect.soft(numeros.nth(1)).toBeEnabled();
      await shot(page, "08-avance-line-selected.png");
    });
  }

  if (!dialogoAbierto) {
    skipStep("Test 9 · Tope de cantidad", "el diálogo de avance no llegó a abrirse");
  } else {
    await runStep("Test 9 · Tope de cantidad al restante", async () => {
      const dialogo = page.getByRole("dialog");
      const piezas = dialogo.locator('input[type="number"]').first();
      expect.soft(restante, "se necesita un restante conocido").not.toBeNull();
      if (restante === null) return;

      const exceso = String(restante + 1000);
      await piezas.fill(exceso);
      const valor = Number(await piezas.inputValue());
      console.log(`  Tecleado ${exceso} → el input quedó en ${valor} (restante ${restante})`);
      expect.soft(valor).toBe(restante);
      await shot(page, "09-quantity-capped.png");
    });
  }

  let avanceCreado = false;
  if (!dialogoAbierto || restante === null || restante < 1) {
    skipStep(
      "Test 10 · Registrar avance",
      restante !== null && restante < 1
        ? "ningún renglón de esta OB tiene saldo pendiente"
        : "el diálogo de avance no llegó a abrirse",
    );
  } else {
    await runStep("Test 10 · Registrar avance", async () => {
      const dialogo = page.getByRole("dialog");
      const numeros = dialogo.locator('input[type="number"]');
      await numeros.nth(0).fill("1");
      await numeros.nth(1).fill("0");
      // El comentario identifica NUESTRA fila para poder borrarla después.
      await dialogo.locator("textarea").fill(comentarioE2E);

      await waitForMutation(
        page,
        async () => {
          await dialogo.getByRole("button", { name: "Registrar avance" }).click();
        },
        { urlPart: "/produccion/bordado-avances/", method: "POST" },
      );

      await expect(dialogo).toBeHidden();
      avanceCreado = true;

      const historial = section(page, /Historial de avances/);
      const fila = historial.locator("tbody tr").filter({ hasText: comentarioE2E });
      await expect.soft(fila).toHaveCount(1);
      await expect.soft(fila.first()).toContainText("1");
      console.log(`  Avance registrado (comentario "${comentarioE2E}")`);

      const resumen = section(page, "Resumen de avance");
      await expect
        .soft(resumen.getByText("Piezas bordadas", { exact: true }))
        .toBeVisible();
      const piezasDespues = await readMetricDone(resumen, "Piezas bordadas");
      console.log(`  Piezas bordadas: ${piezasAntes} → ${piezasDespues}`);
      if (piezasAntes !== null && piezasDespues !== null) {
        expect.soft(piezasDespues).toBe(piezasAntes + 1);
      }
      await shot(page, "10-avance-registered.png");
    });
  }

  if (!avanceCreado) {
    skipStep("Test 11 · Eliminar el avance", "no se creó ningún avance que borrar");
  } else {
    await runStep("Test 11 · Eliminar el avance (limpieza)", async () => {
      const historial = section(page, /Historial de avances/);
      const fila = historial.locator("tbody tr").filter({ hasText: comentarioE2E });

      await fila.first().getByRole("button", { name: "Eliminar avance" }).click();
      const confirmacion = page.getByRole("dialog");
      await expect.soft(confirmacion).toBeVisible();
      await expect.soft(confirmacion).toContainText("Eliminar avance");
      await shot(page, "11-delete-confirmation.png");

      await waitForMutation(
        page,
        async () => {
          await confirmacion.getByRole("button", { name: "Eliminar", exact: true }).click();
        },
        { urlPart: "/produccion/bordado-avances/", method: "DELETE" },
      );

      await expect.soft(fila).toHaveCount(0);
      console.log("  Fila eliminada del historial");

      const resumen = section(page, "Resumen de avance");
      const piezasFinal = await readMetricDone(resumen, "Piezas bordadas");
      console.log(`  Piezas bordadas de vuelta en: ${piezasFinal} (antes ${piezasAntes})`);
      if (piezasAntes !== null && piezasFinal !== null) {
        expect.soft(piezasFinal).toBe(piezasAntes);
      }
      await shot(page, "12-avance-deleted.png");
    });
  }

  // ── Test 12: estatus terminal ─────────────────────────────────────────────
  skipStep(
    "Test 12 · Comportamiento en estatus terminal",
    "no se automatiza: Finalizado y Cancelado (legacy) no tienen salida — verificar " +
      "a mano que con esos estatus la ficha muestra badges y textos sin controles " +
      "de edición",
  );

  // ── Cierre ────────────────────────────────────────────────────────────────
  await shot(page, "13-final-state.png");

  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log(`RESUMEN — ficha ${obFolio || obUrl}`);
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

  // `runStep` traga lo que se lanza para que un paso roto no impida la limpieza
  // de los siguientes, pero eso hacía que Playwright diera el test por bueno
  // (exit 0) mientras el resumen imprimía FAIL: en CI los fallos eran
  // invisibles. Esta aserción —dura, y al final, ya impreso el resumen— es la
  // que traslada el resultado real al código de salida.
  expect(
    fallidos.length,
    `Pasos fallidos: ${fallidos.map((r) => r.step).join(", ")}`,
  ).toBe(0);
});
