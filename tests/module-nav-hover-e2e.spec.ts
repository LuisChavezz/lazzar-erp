import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E manual de la navegación por sub-grupos del módulo (`ModuleNav`) con
 * apertura por hover (`NavigationMenu` de Radix).
 *
 * CÓRRELO ANTES DE ACTUALIZAR `radix-ui` o `@radix-ui/themes`: el componente
 * se apoya en el comportamiento nativo de `NavigationMenu` (hover sin foco,
 * retardos, clic que alterna) y en los tokens de Radix Themes para el estilo.
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `global-search-e2e.spec.ts`.
 *
 * Es una prueba de SOLO LECTURA: escribe en el buscador de una lista (filtro en
 * memoria) y abre menús. No crea, edita ni borra nada.
 *
 * Regresiones que cubre:
 *  - Un menú de sub-grupo abierto por HOVER no toma el foco. Si el usuario
 *    escribía en un campo, lo que teclea sigue llegando al campo y Enter no
 *    navega a una hoja (perdiendo el estado del formulario).
 *  - Un menú abierto con CLIC deja entrar al teclado (flecha abajo enfoca una
 *    opción) y Escape devuelve el foco al disparador.
 *  - Comportamiento nativo de `NavigationMenu` que se acepta y se fija aquí:
 *    un clic sobre un menú ya abierto por hover lo CIERRA (el clic alterna), y
 *    un menú abierto con clic también se cierra al apartar el mouse.
 *
 * Variables de entorno:
 *   BASE_URL         URL del frontend (default `http://localhost:3000`)
 *   MODULE_NAV_PATH  Ruta con ModuleNav por sub-grupos y un campo de texto en la
 *                    página (default `/wms/orders`, que tiene el buscador de la
 *                    lista). CÁMBIALA si tu cuenta no puede abrir esa ruta.
 *
 * Ejecución (solo este archivo; `npm run e2e` a secas corre TODOS los specs):
 *   npm run e2e -- tests/module-nav-hover-e2e.spec.ts
 *   MODULE_NAV_PATH=/finance/invoicing npm run e2e -- tests/module-nav-hover-e2e.spec.ts
 */

const SHOTS = "tests/screenshots";

/** Ruta de prueba. Ver `MODULE_NAV_PATH` en la cabecera. */
const RUTA = process.env.MODULE_NAV_PATH ?? "/wms/orders";

/**
 * Retardo de apertura por hover (100 ms) + margen. Se espera por el efecto
 * visible (el menú aparece); esto solo acota cuánto.
 */
const ESPERA_HOVER = 5_000;

/**
 * Cierre al salir (150 ms fijos en `NavigationMenu`) + margen: para afirmar que
 * algo NO cambió (p. ej. que Enter no navegó).
 */
const ESPERA_SIN_CIERRE = 1_000;

// ── Utilidades ───────────────────────────────────────────────────────────────

type StepStatus = "PASS" | "FAIL" | "SKIP";
const results: { step: string; status: StepStatus; note?: string }[] = [];

/**
 * Ejecuta un bloque y REGISTRA su resultado sin abortar el resto (mismo
 * contrato que en `global-search-e2e.spec.ts`).
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

test("ModuleNav — menús de sub-grupo por hover", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── Localizadores ─────────────────────────────────────────────────────────
  // Por rol y nombre accesible. Los disparadores de sub-grupo son los botones
  // de la navegación del módulo que controlan un menú (`aria-expanded`); las
  // flechas de desplazamiento de la fila también son botones, por eso se acota.
  // El menú abierto es el contenido rotulado por su disparador
  // (`aria-labelledby`); solo está en el DOM mientras está abierto. Sus
  // opciones son enlaces.
  const navModulo = page.getByRole("navigation", { name: "Navegación del módulo" });
  const disparadores = navModulo.locator("button[aria-expanded]");
  const menu = navModulo.locator("[aria-labelledby]");
  const opcionEnfocada = menu.locator("a:focus");
  // El primer campo de texto del contenido: en las listas, el buscador de la
  // tabla (`type="search"`, rol `searchbox`). Hay dos `main` anidados (el del
  // layout y el de algunas páginas), así que se toma el externo.
  const contenido = page.getByRole("main").first();
  const campo = contenido.getByRole("searchbox").or(contenido.getByRole("textbox")).first();

  /** Lleva el puntero a un rincón sin controles, fuera de nav y menús. */
  async function apartarMouse() {
    const vista = page.viewportSize() ?? { width: 1600, height: 1000 };
    await page.mouse.move(vista.width - 20, vista.height - 20);
  }

  /** Estado conocido: la ruta de prueba recién cargada, sin menús abiertos. */
  async function empezarEnRuta() {
    await page.goto(RUTA);
    expect(
      new URL(page.url()).pathname,
      `el proxy rebotó ${RUTA}: usa una ruta que tu cuenta pueda abrir (MODULE_NAV_PATH)`,
    ).toBe(RUTA);
    await expect(disparadores.first()).toBeVisible({ timeout: 30_000 });
    await apartarMouse();
    await expect(menu).toBeHidden();
  }

  // ── Paso 0: login manual ──────────────────────────────────────────────────
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
    console.log(`  Ruta de prueba: ${RUTA} (cámbiala con MODULE_NAV_PATH=...)`);
  });

  // ── Paso 1: escribir con un menú abierto por hover ────────────────────────
  await runStep("Paso 1 · Un menú abierto por hover no roba el foco ni las teclas", async () => {
    await empezarEnRuta();
    await expect(campo, "la ruta de prueba necesita un campo de texto").toBeVisible();

    await campo.click();
    await page.keyboard.type("abc");

    // Hover sobre el primer sub-grupo hasta que abra su menú.
    await disparadores.first().hover();
    await expect(menu).toBeVisible({ timeout: ESPERA_HOVER });
    await shot(page, "module-nav-01-menu-por-hover.png");

    // Con el menú abierto se sigue escribiendo y se pulsa Enter: si una opción
    // del menú tuviera el foco, las teclas no llegarían al campo y Enter
    // seguiría el enlace.
    const urlAntes = page.url();
    await page.keyboard.type("def");
    await page.keyboard.press("Enter");

    await expect(campo, "todo lo tecleado debe llegar al campo").toHaveValue(/abcdef/);
    await expect(campo, "el foco debe seguir en el campo").toBeFocused();
    await expect(opcionEnfocada, "ninguna opción del menú debe tener el foco").toHaveCount(0);
    // Margen para una navegación que llegara tarde: la URL NO debe cambiar.
    await page.waitForTimeout(ESPERA_SIN_CIERRE);
    expect(page.url(), "Enter no debe navegar").toBe(urlAntes);

    // Al apartar el mouse el menú abierto por hover se cierra, y el foco y el
    // texto siguen intactos.
    await apartarMouse();
    await expect(menu).toBeHidden({ timeout: 5_000 });
    await expect(campo).toBeFocused();
    await expect(campo).toHaveValue(/abcdef/);
  });

  // ── Paso 2: un menú abierto con clic deja entrar al teclado ─────────────
  await runStep("Paso 2 · Un menú abierto con clic deja entrar al teclado", async () => {
    await empezarEnRuta();

    // `click()` mueve el puntero y pulsa de inmediato: el clic llega antes del
    // retardo de hover, así que es una apertura por clic.
    await disparadores.first().click();
    await expect(menu).toBeVisible();

    // Flecha abajo desde el disparador entra al menú y enfoca una opción.
    await disparadores.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(opcionEnfocada, "la flecha abajo debe enfocar una opción").toHaveCount(1);
    await shot(page, "module-nav-02-menu-por-clic.png");

    // Escape lo cierra y devuelve el foco a su disparador.
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(disparadores.first()).toBeFocused();

    // Nativo de `NavigationMenu`: abierto con clic, también se cierra al
    // apartar el mouse.
    await disparadores.first().click();
    await expect(menu).toBeVisible();
    await apartarMouse();
    await expect(menu, "un menú abierto con clic se cierra al apartar el mouse").toBeHidden({
      timeout: 5_000,
    });
  });

  // ── Paso 3: clic sobre un menú ya abierto por hover ───────────────────────
  await runStep("Paso 3 · Un clic sobre un menú abierto por hover lo cierra", async () => {
    await empezarEnRuta();

    // Hover y espera MÁS que el retardo de apertura, como haría una persona.
    await disparadores.first().hover();
    await expect(menu).toBeVisible({ timeout: ESPERA_HOVER });
    await page.waitForTimeout(400);

    // Nativo de `NavigationMenu`: el clic alterna, así que lo cierra.
    await disparadores.first().click();
    await expect(menu, "el clic sobre un menú abierto por hover lo cierra").toBeHidden();

    // Y con el puntero aún encima no se reabre solo (hace falta salir y
    // volver a entrar).
    await page.waitForTimeout(ESPERA_SIN_CIERRE);
    await expect(menu).toBeHidden();
  });

  // ── Cierre ────────────────────────────────────────────────────────────────
  await shot(page, "module-nav-03-estado-final.png");

  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log("RESUMEN — ModuleNav por hover");
  console.log("═".repeat(ancho + 30));
  console.log(`Ruta de prueba: ${RUTA}`);
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
  // real al código de salida (mismo motivo que en `global-search-e2e.spec.ts`).
  expect(
    fallidos.length,
    `Pasos fallidos: ${fallidos.map((r) => r.step).join(", ")}`,
  ).toBe(0);
});
