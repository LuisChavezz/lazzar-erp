import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual del alta de un picking parcial (`/wms/picking` → "Nuevo picking").
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `ob-ficha-e2e.spec.ts` y `rfid-scanner-e2e.spec.ts`.
 *
 * ⚠ El paso 4 es IRREVERSIBLE Y REAL: `POST /wms/pickings/` crea un documento
 * en el backend de producción y la UI NO ofrece forma de borrarlo ni de
 * cancelarlo (`PickingColumns` solo tiene "Ver Detalles"). A diferencia de la
 * ficha de la OB —que restaura todo lo que toca— aquí no hay limpieza posible.
 *
 * Por eso la creación es OPT-IN (`RUN_CREATE=1`) y no opt-out, por el mismo
 * motivo que la purga de `rfid-scanner-e2e`: `npm run e2e` sin argumentos
 * recoge TODOS los specs de `tests/`, así que un opt-out convertiría el comando
 * de siempre en uno que además siembra pickings en producción, sin que quien lo
 * teclea tenga por qué saber que este archivo existe.
 *
 * Sin `RUN_CREATE`, los pasos 1-3 corren completos —incluida la captura de
 * cantidades— y la prueba se detiene con el formulario LISTO PARA ENVIAR: se
 * verifica que el botón "Registrar picking" quedó habilitado y se captura la
 * pantalla, pero no se pulsa. Eso ejercita todo el asistente (que es donde
 * viven los cambios recientes: selector de almacén destino y encabezado
 * origen/destino del Paso 2) sin escribir nada.
 *
 * Variables de entorno:
 *   BASE_URL     URL del frontend (default `http://localhost:3000`)
 *   RUN_CREATE   `1` para EJECUTAR el POST irreversible (pasos 4-5).
 *                Sin ella, los pasos 4-5 se marcan como SKIP.
 *   PEDIDO_FOLIO Fuerza un pedido concreto (por folio) en vez de recorrer la
 *                lista buscando uno con tallas surtibles.
 */

const SHOTS = "tests/screenshots";
const RUN_CREATE = process.env.RUN_CREATE === "1";
const PEDIDO_FOLIO = process.env.PEDIDO_FOLIO;

/** Cuántos pedidos se prueban antes de rendirse (cada uno cuesta un GET). */
const MAX_PEDIDOS_A_PROBAR = 6;

const PICKINGS_POST = { urlPart: "/wms/pickings/", method: "POST" };

/**
 * El `GET` del onboarding acotado a un pedido — el que trae el pendiente por
 * talla del Paso 2. Se distingue del `GET /wms/pickings/` del listado por la
 * ruta (`/onboarding/`), no por el método.
 */
const isOnboardingGet = (url: string, method: string) =>
  url.includes("/wms/pickings/onboarding/") && method === "GET";

/** El `GET` del listado. Excluye `/onboarding/`, que cuelga de la misma raíz. */
const isPickingsListGet = (url: string, method: string) =>
  url.includes("/wms/pickings/") && !url.includes("/onboarding") && method === "GET";

// ── Utilidades ───────────────────────────────────────────────────────────────

type StepStatus = "PASS" | "FAIL" | "SKIP";
const results: { step: string; status: StepStatus; note?: string }[] = [];

/**
 * Ejecuta un bloque y REGISTRA su resultado sin abortar el resto. Las
 * comprobaciones de dentro usan `expect.soft`, que acumula fallos sin lanzar;
 * este `try/catch` cubre lo otro —un selector que no aparece, una acción que
 * revienta— para que un paso roto no impida que los siguientes informen.
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
 * Espera la respuesta de una mutación disparada por `action`. El escucha se
 * registra ANTES de `action()`: al revés, una respuesta rápida llegaría antes
 * que el escucha y la espera colgaría.
 */
async function waitForMutation(
  page: Page,
  action: () => Promise<void>,
  match: { urlPart: string; method: string },
) {
  const pending = page.waitForResponse(
    (response) =>
      response.url().includes(match.urlPart) &&
      response.request().method() === match.method,
    { timeout: 60_000 },
  );
  await action();
  const response = await pending;
  console.log(`  ↪ ${match.method} ${response.status()} ${new URL(response.url()).pathname}`);
  return response;
}

/**
 * Valores reales de un `<select>`, sin el centinela "0" de "sin seleccionar"
 * (`createEmptyPickingHeaderValues`) ni el `<option value="">` vacío.
 */
async function optionValues(select: Locator): Promise<string[]> {
  const values = await select
    .locator("option")
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value));
  return values.filter((value) => value !== "" && value !== "0");
}

/** Texto de la opción actualmente elegida en un `<select>`. */
async function selectedLabel(select: Locator): Promise<string> {
  return select
    .locator("option:checked")
    .first()
    .innerText()
    .then((text) => text.trim())
    .catch(() => "");
}

/**
 * Valor de una celda del encabezado del Paso 2 (`PEDIDO` / `CLIENTE` /
 * `ALMACÉN ORIGEN` / `ALMACÉN DESTINO`).
 *
 * Cada celda es un `<div>` con dos `<p>`: rótulo y valor. El rótulo se pinta en
 * `uppercase` por CSS pero el texto del DOM conserva la capitalización original
 * ("Almacén origen"), así que se busca por ese texto —insensible a mayúsculas—
 * y se lee el `<p>` hermano.
 */
async function headerValue(dialog: Locator, label: string): Promise<string> {
  const value = dialog
    .getByText(new RegExp(`^${label}$`, "i"))
    .first()
    .locator("xpath=following-sibling::p[1]");
  return (await value.innerText()).trim();
}

// ── Suite ────────────────────────────────────────────────────────────────────

test("Alta de picking parcial — asistente de 2 pasos", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  /** Sello único de ESTA corrida, para reconocer lo que escribe la prueba. */
  const RUN_STAMP = Date.now();
  const OBSERVACIONES_E2E = `PICKING E2E ${RUN_STAMP}`;

  /** Datos del pedido/almacenes elegidos, para el resumen final. */
  let pedidoLabel = "";
  let destinoLabel = "";
  let tallaLabel = "";
  let cantidadCapturada = "";
  /** El Paso 2 quedó con al menos una talla surtible y cantidad capturada. */
  let listoParaEnviar = false;
  /** Folio del picking creado (solo con `RUN_CREATE=1`). */
  let folioCreado = "";

  const dialog = page.getByRole("dialog");

  // ── Login manual ──────────────────────────────────────────────────────────
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

    // Tras el resume: cualquier ruta sirve mientras NO sea login ni la
    // selección de sucursal — el `proxy.ts` reenvía ahí a quien no tenga
    // sesión o workspace, así que seguir en ellas significa login incompleto.
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page).not.toHaveURL(/\/select-branch/);
    console.log(`  Sesión iniciada — URL actual: ${page.url()}`);
    console.log(
      RUN_CREATE
        ? "  ⚠ RUN_CREATE=1 → esta corrida CREARÁ un picking real (no se puede borrar)"
        : "  RUN_CREATE ausente → ensayo en seco: se llena todo pero NO se envía",
    );
  });

  // ── Paso 1: abrir el asistente ────────────────────────────────────────────
  await runStep("Paso 1 · Abrir el asistente desde el listado", async () => {
    await page.goto("/wms/picking");

    // El botón vive en el `actionButton` del toolbar de `DataTable`, que sigue
    // montado durante la carga de la tabla — no hay que esperar a los datos.
    const nuevo = page.getByRole("button", { name: "Nuevo picking" });
    await expect(nuevo).toBeVisible({ timeout: 60_000 });
    await shot(page, "picking-01-listado.png");

    // El onboarding "solo selectores" (sin `?pedido`) se dispara al montarse el
    // Paso 1; esperarlo evita capturar el Loader en vez del formulario.
    const onboarding = page
      .waitForResponse((r) => isOnboardingGet(r.url(), r.request().method()), {
        timeout: 60_000,
      })
      .catch(() => null);
    await nuevo.click();
    await onboarding;

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Nuevo Picking")).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Detalles del picking" }),
    ).toBeVisible({ timeout: 60_000 });
    await shot(page, "picking-02-paso1-vacio.png");
  });

  // ── Paso 2: encabezado ────────────────────────────────────────────────────
  // Los `<select>` de `FormSelect` reciben `id = name`, así que el `<label>`
  // los asocia y `getByLabel` es el selector estable (no hay test-ids en el
  // proyecto). Se acota al diálogo: el rótulo "Pedido" también aparece como
  // texto plano en el encabezado del Paso 2.
  const selPedido = dialog.getByLabel("Pedido", { exact: true });
  const selOperador = dialog.getByLabel("Operador", { exact: true });
  const selDestino = dialog.getByLabel("Almacén destino", { exact: true });
  const continuar = dialog.getByRole("button", { name: "Continuar a surtir tallas" });

  /** Pedidos que el selector ofrece, en el orden en que los pinta el backend. */
  let pedidoValues: string[] = [];

  await runStep("Paso 2 · Encabezado (pedido, operador, almacén destino)", async () => {
    await expect(selPedido).toBeVisible();
    await expect(selOperador).toBeVisible();
    await expect(selDestino).toBeVisible();

    pedidoValues = await optionValues(selPedido);
    console.log(`  Pedidos ofrecidos: ${pedidoValues.length}`);
    expect(pedidoValues.length, "el onboarding debe ofrecer al menos un pedido").toBeGreaterThan(0);

    // Operador: `PickingWizardStep1` preselecciona al usuario de la sesión si
    // aparece en la lista. Solo se elige a mano cuando no lo hizo.
    if (!(await selOperador.inputValue()).match(/^[1-9]/)) {
      const operadores = await optionValues(selOperador);
      expect(operadores.length, "debe haber al menos un operador").toBeGreaterThan(0);
      await selOperador.selectOption(operadores[0]);
    }
    console.log(`  Operador: ${await selectedLabel(selOperador)}`);

    // Prioridad y tipo ya vienen con default ("Media" / "Por pedido"): se
    // dejan tal cual — la prueba no los ejercita, solo confirma que existen.
    await expect.soft(dialog.getByLabel("Prioridad", { exact: true })).toBeVisible();
    await expect.soft(dialog.getByLabel("Tipo de picking", { exact: true })).toBeVisible();

    await dialog
      .getByLabel("Observaciones (opcional)", { exact: true })
      .fill(OBSERVACIONES_E2E);
  });

  // ── Paso 3: elegir un pedido con tallas surtibles + capturar cantidad ──────
  await runStep("Paso 3 · Paso 2 del asistente: tallas surtibles", async () => {
    // El Paso 2 solo es utilizable si el pedido tiene tallas pendientes CON
    // existencia; si no, pinta un panel ámbar y el envío queda muerto. Igual
    // que `ob-ficha-e2e` recorre el listado buscando una OB no terminal, aquí
    // se recorren pedidos hasta dar con uno surtible.
    const candidatos = PEDIDO_FOLIO
      ? pedidoValues // se filtra por folio dentro del bucle
      : pedidoValues.slice(0, MAX_PEDIDOS_A_PROBAR);

    for (const value of candidatos) {
      await selPedido.selectOption(value);
      pedidoLabel = await selectedLabel(selPedido);

      if (PEDIDO_FOLIO && !pedidoLabel.includes(PEDIDO_FOLIO)) continue;

      // El destino puede quedar limpio al cambiar de pedido: `PickingWizardStep1`
      // acota las opciones a la sucursal del pedido y descarta la elegida si ya
      // no aplica. Se re-elige DESPUÉS de fijar el pedido, nunca antes.
      const destinos = await optionValues(selDestino);
      if (destinos.length === 0) {
        console.log(`  ${pedidoLabel} — sin almacenes de entrada en su sucursal, siguiente`);
        continue;
      }
      if ((await selDestino.inputValue()) === "0") {
        await selDestino.selectOption(destinos[0]);
      }
      destinoLabel = await selectedLabel(selDestino);
      console.log(`  ${pedidoLabel} → destino "${destinoLabel}" (${destinos.length} opción/es)`);

      await expect(continuar).toBeEnabled();
      const onboarding = page
        .waitForResponse((r) => isOnboardingGet(r.url(), r.request().method()), {
          timeout: 60_000,
        })
        .catch(() => null);
      await continuar.click();
      await onboarding;

      // Panel ámbar = pedido inservible (sin tallas, sin pendiente o sin
      // existencia). Los tres textos viven en el mismo `<h3>`.
      const bloqueado = dialog.getByRole("heading", {
        name: /no tiene tallas (pendientes|registradas)|No hay existencia disponible/i,
      });
      if (await bloqueado.isVisible().catch(() => false)) {
        const motivo = (await bloqueado.innerText()).trim();
        console.log(`  ${pedidoLabel} — "${motivo}", regresando`);
        await dialog.getByRole("button", { name: "Regresar" }).click();
        await expect(selPedido).toBeVisible();
        continue;
      }

      // Encabezado del Paso 2: las cuatro celdas, incluida la de destino que se
      // añadió junto al selector. Es la comprobación de que lo elegido en el
      // Paso 1 llega intacto al Paso 2.
      await expect(dialog.getByRole("heading", { name: "Tallas por surtir" })).toBeVisible();
      const origenMostrado = await headerValue(dialog, "Almacén origen");
      const destinoMostrado = await headerValue(dialog, "Almacén destino");
      console.log(`  Encabezado — origen "${origenMostrado}" · destino "${destinoMostrado}"`);
      expect.soft(origenMostrado).not.toBe("—");
      expect.soft(destinoMostrado).toBe(destinoLabel);
      await shot(page, "picking-03-paso2-encabezado.png");

      // Primera talla con cupo. Los inputs deshabilitados son las tallas sin
      // pendiente o sin existencia, que la UI muestra en vez de ocultar.
      const inputs = dialog.getByLabel(/^Cantidad a surtir de /);
      const total = await inputs.count();
      let elegido = -1;
      for (let i = 0; i < total; i += 1) {
        if (await inputs.nth(i).isEnabled()) {
          elegido = i;
          break;
        }
      }
      console.log(`  Tallas en pantalla: ${total} · primera con cupo: ${elegido}`);
      if (elegido === -1) {
        await dialog.getByRole("button", { name: "Regresar" }).click();
        await expect(selPedido).toBeVisible();
        continue;
      }

      // Se captura UNA SOLA línea a propósito: varias tallas pueden compartir
      // la misma existencia (`sharedPool`) y la suma dispararía el bloqueo por
      // exceso agregado, que es un rechazo determinista del backend.
      const input = inputs.nth(elegido);
      tallaLabel = (await input.getAttribute("aria-label")) ?? "";
      await input.fill("1");
      // El componente clampa al techo de la línea: si el máximo es < 1, lo que
      // queda escrito es ese máximo, no lo tecleado.
      cantidadCapturada = await input.inputValue();
      console.log(`  ${tallaLabel} → cantidad ${cantidadCapturada}`);
      expect(Number(cantidadCapturada)).toBeGreaterThan(0);

      // El aviso de exceso compartido no debe aparecer con una sola línea.
      await expect
        .soft(dialog.getByText("Varias tallas comparten la misma existencia"))
        .toBeHidden();

      const registrar = dialog.getByRole("button", { name: "Registrar picking" });
      await expect(registrar).toBeEnabled();
      listoParaEnviar = true;
      await shot(page, "picking-04-cantidad-capturada.png");
      break;
    }

    expect(
      listoParaEnviar,
      `ninguno de los pedidos probados tenía tallas surtibles${
        PEDIDO_FOLIO ? ` (filtrando por PEDIDO_FOLIO=${PEDIDO_FOLIO})` : ""
      }`,
    ).toBe(true);
  });

  // ── Paso 4: registrar (IRREVERSIBLE) ──────────────────────────────────────
  if (!listoParaEnviar) {
    skipStep("Paso 4 · Registrar el picking", "el Paso 3 no dejó el formulario listo");
  } else if (!RUN_CREATE) {
    skipStep(
      "Paso 4 · Registrar el picking",
      "RUN_CREATE ausente — formulario listo y verificado, POST no ejecutado",
    );
  } else {
    await runStep("Paso 4 · Registrar el picking (POST real)", async () => {
      console.log("  ⚠ IRREVERSIBLE: la UI no permite borrar ni cancelar un picking");

      const response = await waitForMutation(
        page,
        async () => {
          await dialog.getByRole("button", { name: "Registrar picking" }).click();
        },
        PICKINGS_POST,
      );

      expect.soft(response.status(), "el POST debe responder 201").toBe(201);
      const body = await response.json().catch(() => null);
      folioCreado = (body?.folio as string | undefined) ?? "";
      console.log(`  Picking creado: folio ${folioCreado || "(sin folio en la respuesta)"}`);
      expect.soft(folioCreado, "la respuesta debe traer folio").toBeTruthy();

      // El diálogo se cierra desde `onSuccess` del asistente.
      await expect(dialog).toBeHidden({ timeout: 30_000 });
      await expect.soft(page.getByText("Picking registrado correctamente")).toBeVisible();
      await shot(page, "picking-05-registrado.png");
    });
  }

  // ── Paso 5: confirmar en el listado ───────────────────────────────────────
  if (!RUN_CREATE || !folioCreado) {
    skipStep(
      "Paso 5 · Confirmar el picking en el listado",
      RUN_CREATE ? "no se llegó a crear ningún picking" : "no se creó nada que buscar",
    );
  } else {
    await runStep("Paso 5 · Confirmar el picking en el listado", async () => {
      // `useCreatePicking` invalida `["pickings"]`, así que el listado se
      // recarga solo; se espera ese GET antes de buscar para no filtrar sobre
      // la caché anterior (que aún no trae el folio nuevo).
      await page
        .waitForResponse((r) => isPickingsListGet(r.url(), r.request().method()), {
          timeout: 30_000,
        })
        .catch(() => null);

      // La caja de búsqueda de `DataTable` arranca colapsada (ancho 0): hay que
      // desplegarla con su botón antes de escribir.
      await page.getByRole("button", { name: "Buscar", exact: true }).click();
      const busqueda = page.getByLabel("Buscar folio, pedido u operador...");
      await expect(busqueda).toBeVisible();
      await busqueda.fill(folioCreado);

      // El folio se pinta como texto plano (`PickingColumns` no lo hace
      // clicable, a diferencia de otros módulos), así que se busca la FILA que
      // lo contiene, no un botón.
      const fila = page.locator("tbody tr").filter({ hasText: folioCreado });
      await expect(fila).toHaveCount(1);
      await expect.soft(fila.first()).toContainText(pedidoLabel.split("—")[0].trim());
      console.log(`  Folio ${folioCreado} visible en el listado`);
      await shot(page, "picking-06-listado-confirmado.png");
    });
  }

  // ── Cierre ────────────────────────────────────────────────────────────────
  await shot(page, "picking-07-estado-final.png");

  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log(`RESUMEN — alta de picking${folioCreado ? ` · folio ${folioCreado}` : ""}`);
  console.log("═".repeat(ancho + 30));
  console.log(`Pedido:           ${pedidoLabel || "—"}`);
  console.log(`Almacén destino:  ${destinoLabel || "—"}`);
  console.log(`Talla capturada:  ${tallaLabel || "—"} × ${cantidadCapturada || "—"}`);
  console.log(`Observaciones:    ${OBSERVACIONES_E2E}`);
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

  // `runStep` traga lo que se lanza para que un paso roto no impida que los
  // siguientes informen, pero eso haría que Playwright diera el test por bueno
  // (exit 0) mientras el resumen imprime FAIL. Esta aserción —dura, y al final,
  // ya impreso el resumen— traslada el resultado real al código de salida.
  expect(
    fallidos.length,
    `Pasos fallidos: ${fallidos.map((r) => r.step).join(", ")}`,
  ).toBe(0);
});
