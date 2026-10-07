import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getSearchApertura } from "@/src/features/search/constants/globalSearch";

/**
 * E2E manual de la búsqueda global (paleta de comandos, `src/features/search/`).
 *
 * NO automatiza el login: abre `/auth/login`, se detiene en `page.pause()` y
 * espera a que la persona entre a mano (incluida la selección de sucursal) y
 * pulse "Resume" en el Playwright Inspector. Mismo patrón que
 * `picking-creation-e2e.spec.ts`, `ob-ficha-e2e.spec.ts` y
 * `rfid-scanner-e2e.spec.ts`.
 *
 * Es una prueba de SOLO LECTURA: busca, navega y abre diálogos. No crea, edita
 * ni borra nada, así que puede correrse con cualquier cuenta cuantas veces haga
 * falta. Tampoco intercepta `/search/`: pega al backend real con la sesión real
 * —que es justo lo que se quiere comprobar—.
 *
 * ── AGNÓSTICA DE ROL ────────────────────────────────────────────────────────
 * El backend recorta `grupos` por permiso, así que CADA CUENTA VE UN CONJUNTO
 * DISTINTO de entidades. La prueba nunca asume cuántos grupos llegan ni cuáles:
 * lee los que se pinten y trabaja con ellos. El `tipo` de cada grupo se obtiene
 * del DOM (`aria-labelledby="global-search-group-<tipo>"`), no de la etiqueta en
 * español ni de datos concretos. Un grupo de una entidad futura que el frontend
 * aún no sepa abrir se salta con nota, no rompe.
 *
 * Tampoco se afirma nada sobre folios, nombres ni ids concretos: solo
 * ESTRUCTURA (existe una fila, existe un encabezado de grupo, la URL casa con
 * `/orders/\d+`). La única comparación de datos es de la fila consigo misma: el
 * folio de una orden de producción elegida debe aparecer en su página de
 * detalle. El mismo archivo debe pasar con un admin (todos los grupos) y con un
 * usuario de un solo permiso (un grupo).
 *
 * Variables de entorno:
 *   BASE_URL      URL del frontend (default `http://localhost:3000`)
 *   SEARCH_QUERY  Término a buscar (default "com"). CÁMBIALO por un fragmento
 *                 con datos en la cuenta con la que corres: lo ideal es un trozo
 *                 del nombre de un cliente con actividad, para que aparezcan a la
 *                 vez pedidos, cotizaciones y clientes y se ejerciten las tres
 *                 aperturas. Debe tener al menos `longitud_minima_nombre` (3)
 *                 caracteres para que el backend busque también por nombre.
 *
 *   E2E_EMAIL / E2E_PASSWORD  Opcionales. Con las dos, el Paso 0 entra solo
 *                 (y elige la primera empresa/sucursal) en vez de pausar. Solo
 *                 cuentas de prueba sin MFA ACTIVADO (el aviso opcional de
 *                 activarlo se descarta solo); pásalas por entorno, nunca en el
 *                 repo.
 *
 * Ejecución (solo este archivo; `npm run e2e` a secas corre TODOS los specs):
 *   npm run e2e -- tests/global-search-e2e.spec.ts
 *   SEARCH_QUERY=lopez npm run e2e -- tests/global-search-e2e.spec.ts
 *   SEARCH_QUERY=OB-000 npm run e2e -- tests/global-search-e2e.spec.ts   (órdenes de bordado)
 *   SEARCH_QUERY=OR-000 npm run e2e -- tests/global-search-e2e.spec.ts   (órdenes de reflejante)
 *   SEARCH_QUERY=CM-000 npm run e2e -- tests/global-search-e2e.spec.ts   (órdenes de corte de manga)
 *   SEARCH_QUERY=FAC-   npm run e2e -- tests/global-search-e2e.spec.ts   (facturas)
 * Los folios de órdenes y facturas solo casan con su propio término: con el
 * default "com" esos grupos no aparecen y sus aperturas no se ejercitan.
 */

const SHOTS = "tests/screenshots";

/** Término de búsqueda. Ver `SEARCH_QUERY` en la cabecera. */
const QUERY = process.env.SEARCH_QUERY ?? "com";

/**
 * Credenciales opcionales para el login automático. Sin ellas el Paso 0 se
 * detiene en `page.pause()` para el login manual de siempre. Solo cuentas de
 * prueba sin MFA activado, y siempre por entorno: nunca escritas en el repo.
 */
const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

/**
 * Entidades que se abren por RUTA sin `?from=` (órdenes de producción y
 * factura): listado del módulo (base de la URL del detalle) y rótulo del enlace
 * "Volver" de su página, que sin origen cae a ese listado.
 */
const ORDENES_PRODUCCION: Record<string, { listado: string; volver: string }> = {
  factura: {
    listado: "/finance/invoicing",
    volver: "Volver a Facturación",
  },
  orden_bordado: {
    listado: "/manufacturing/embroidery",
    volver: "Volver a Órdenes de Bordado",
  },
  orden_reflejante: {
    listado: "/manufacturing/reflective-orders",
    volver: "Volver a Órdenes de Reflejante",
  },
  orden_corte_manga: {
    listado: "/manufacturing/corte-manga",
    volver: "Volver a Órdenes de Corte de Manga",
  },
};

/** Término de 3+ caracteres que no debería casar con nada (Paso 5b). */
const SIN_COINCIDENCIAS = "zqxjw-nada-e2e";

/**
 * Longitudes del contrato de `GET /search/`. Son el DEFAULT del que parte la UI
 * antes de la primera respuesta; la propia respuesta las trae (`longitud_minima`,
 * `longitud_minima_nombre`) y la prueba las vuelve a leer del texto en pantalla
 * en vez de darlas por buenas.
 */
const MIN_LEN = 2;
const MIN_LEN_NOMBRE = 3;

/** Debounce (350 ms) + margen, para afirmar que algo NO ocurrió. */
const ESPERA_SIN_PETICION = 1_500;

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

/** Cualquier petición al endpoint de búsqueda, sea cual sea el `q`. */
const esPeticionDeBusqueda = (url: string) => /\/search\/?(\?|$)/.test(url);

/**
 * Estado de "inercia" de la página. Radix bloquea el fondo mientras hay un
 * diálogo abierto (`pointer-events: none` en el body y scroll bloqueado por
 * `react-remove-scroll`): eso es CORRECTO durante la apertura. Lo que se vigila
 * es que al cerrar quede limpio — el síntoma clásico de dos diálogos cuyos
 * efectos se pisan es un body que se queda inerte para siempre.
 */
async function estadoBody(page: Page) {
  return page.evaluate(() => {
    const estilo = getComputedStyle(document.body);
    return {
      pointerEvents: estilo.pointerEvents,
      overflow: estilo.overflow,
      ariaHidden: document.body.getAttribute("aria-hidden"),
    };
  });
}

/**
 * Estado de error y de carga del diálogo de detalle, copiados de su componente:
 * `QuoteDetails` (bloque rosa, y un esqueleto `role="status"` cuyo nombre solo
 * existe como `aria-label`, no como texto: por eso la carga se localiza por rol
 * y no con `getByText`). La factura ya no es diálogo: tiene página propia.
 *
 * Regresión que se vigila: si al cerrar se suelta el id del diálogo mientras
 * Radix aún anima la salida, su consulta se apaga y el contenido cae al estado
 * de error, que DESTELLA durante la animación. La paleta conserva el id hasta
 * que el cierre termina, así que el texto de error no debe aparecer nunca.
 */
const TEXTO_DETALLE: Record<
  string,
  { error: string; cargando: (dialogo: Locator) => Locator }
> = {
  cotizacion: {
    error: "No se pudieron cargar los detalles del pedido.",
    cargando: (dialogo) => dialogo.getByRole("status", { name: "Cargando detalles del pedido" }),
  },
};

/**
 * Instala un `MutationObserver` sobre el body que anota si `texto` se AÑADE al
 * DOM (nodo nuevo o texto cambiado). Se instala justo antes de cerrar, con el
 * diálogo ya resuelto, así que cualquier aparición es un destello del cierre.
 */
async function vigilarTexto(page: Page, texto: string) {
  await page.evaluate((t) => {
    const w = window as unknown as { __destello?: boolean; __obs?: MutationObserver };
    w.__destello = false;
    w.__obs?.disconnect();
    w.__obs = new MutationObserver((mutaciones) => {
      for (const m of mutaciones) {
        const nodos =
          m.type === "characterData" ? [m.target] : Array.from(m.addedNodes);
        if (nodos.some((n) => (n.textContent ?? "").includes(t))) w.__destello = true;
      }
    });
    w.__obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }, texto);
}

/** Corta la vigilancia y devuelve si el texto llegó a aparecer. */
async function cortarVigilancia(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const w = window as unknown as { __destello?: boolean; __obs?: MutationObserver };
    w.__obs?.disconnect();
    return w.__destello === true;
  });
}

// ── Suite ────────────────────────────────────────────────────────────────────

test("Búsqueda global — paleta de comandos", async ({ page }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── Localizadores ─────────────────────────────────────────────────────────
  // Todo por rol/texto accesible, sin clases ni CSS de presentación.
  //
  // La paleta se identifica por el placeholder de SU input y no por el rol
  // `dialog` a secas: el detalle de cotización también es un `dialog` y ambos
  // aparecen en esta prueba. El botón del header comparte el rótulo accesible
  // "Buscar en el sistema" con el input, así que se acota al banner.
  const campo = page.getByPlaceholder("Buscar en el sistema...");
  const paleta = page.getByRole("dialog").filter({ has: campo });
  const opciones = paleta.getByRole("option");
  const grupos = paleta.getByRole("group");
  const activa = paleta.getByRole("option", { selected: true });
  const disparador = page
    .getByRole("banner")
    .getByRole("button", { name: "Buscar en el sistema", exact: true });
  const dialogoCotizacion = page
    .getByRole("dialog")
    .filter({ hasText: "Detalle de Cotización" });

  /** Resultado del vigilante de destello de error por diálogo (`tipo` → apareció). */
  const destellos: Record<string, boolean> = {};
  /** Resultado del "Volver" de la página de orden de bordado. */
  /** Resultado del "Volver" de cada página de orden de producción (`tipo` → PASS/FAIL). */
  const volverOrdenes: Record<string, string> = {};

  /** Rutas de (Main) desde las que se abrió la paleta. */
  const rutasProbadas: string[] = [];
  /** Grupos (`tipo`) que la cuenta ve con `QUERY`. Se llena en el Paso 5. */
  let tiposVisibles: string[] = [];
  /** Filas de cada grupo pintado en la búsqueda del Paso 5. */
  let filasPorTipo: Record<string, number> = {};
  /** `tipo(filas)` de cada grupo pintado, para el log y el resumen. */
  const describirGrupos = () =>
    tiposVisibles.map((t) => `${t}(${filasPorTipo[t] ?? "?"})`).join(", ");
  /** Etiquetas de esos grupos, para el resumen. */
  let etiquetasVisibles: string[] = [];

  // ── Helpers que necesitan `page` ──────────────────────────────────────────

  /**
   * Abre la paleta desde el botón del header — su único punto de entrada (no
   * hay atajo de teclado). Exige estar en una ruta de (Main), que es donde vive
   * el header.
   */
  async function abrirPaleta() {
    await disparador.click();
    await expect(paleta).toBeVisible({ timeout: 15_000 });
  }

  async function cerrarPaleta() {
    await page.keyboard.press("Escape");
    await expect(paleta).toBeHidden({ timeout: 15_000 });
  }

  /**
   * Deja la página en un estado conocido antes de cada paso.
   *
   * `runStep` aísla los FALLOS, pero no el estado: si un paso muere con la
   * paleta abierta, el siguiente ni siquiera podría pulsar el botón del header
   * —el overlay del diálogo se come el clic— y reportaría un fallo que no es
   * suyo, encadenando el resto. Una navegación completa desmonta cualquier
   * diálogo abierto, así que cada paso arranca desde el Home.
   */
  async function empezarEnHome() {
    await page.goto("/");
    await expect(disparador).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Escribe el término y espera a que la paleta haya RESUELTO: o hay filas, o
   * dice que no hay resultados. Se espera por el efecto visible y no por la
   * respuesta HTTP porque con `keepPreviousData` la lista anterior sigue en
   * pantalla mientras llega la nueva, y lo que importa es el estado final.
   */
  async function buscar(termino: string) {
    await campo.fill(termino);
    await expect(async () => {
      const hayFilas = (await opciones.count()) > 0;
      const vacio = await paleta
        .getByText(/Sin resultados para/)
        .isVisible()
        .catch(() => false);
      expect(hayFilas || vacio, "la paleta debe resolver a filas o a 'sin resultados'").toBe(
        true,
      );
    }).toPass({ timeout: 45_000 });
  }

  /** `tipo` de un grupo, leído del `aria-labelledby` que lo rotula. */
  async function tipoDeGrupo(grupo: Locator): Promise<string> {
    const rotulo = (await grupo.getAttribute("aria-labelledby")) ?? "";
    return rotulo.replace("global-search-group-", "");
  }

  // ── Paso 0: login (automático con E2E_EMAIL/E2E_PASSWORD, si no manual) ───
  // El modo lo deciden las DOS variables juntas: con una sola, el nombre del
  // paso diría "automático" y el cuerpo se quedaría en la pausa manual.
  const loginAutomatico = Boolean(E2E_EMAIL && E2E_PASSWORD);
  await runStep(loginAutomatico ? `Paso 0 · Login automático (${E2E_EMAIL})` : "Paso 0 · Login manual (pausa)", async () => {
    if (Boolean(E2E_EMAIL) !== Boolean(E2E_PASSWORD)) {
      throw new Error("E2E_EMAIL y E2E_PASSWORD van juntas: define las dos o ninguna");
    }
    await page.goto("/auth/login");
    if (E2E_EMAIL && E2E_PASSWORD) {
      await page.getByPlaceholder("Correo electrónico").fill(E2E_EMAIL);
      await page.getByPlaceholder("Contraseña").fill(E2E_PASSWORD);
      await page.locator('button[type="submit"]').click();
      // Tras enviar hay tres desenlaces, y se espera a CUALQUIERA en un solo
      // plazo: salir del login; el aviso OPCIONAL de activar MFA, que algunas
      // cuentas reciben (no siempre) en la misma página y se descarta; o el
      // rechazo, que el login comunica con un toast (`role="status"`). Así unas
      // credenciales malas fallan en ese plazo con el mensaje real, en vez de
      // agotar dos esperas seguidas.
      const sinMfa = page.getByRole("button", { name: "Continuar sin MFA" });
      const toastLogin = page.getByRole("status").filter({ hasText: /\S/ });
      const fueraDeLogin = (url: URL) => !url.pathname.startsWith("/auth/login");
      let desenlace = "";
      await expect
        .poll(
          async () => {
            if (fueraDeLogin(new URL(page.url()))) desenlace = "dentro";
            else if (await sinMfa.isVisible()) desenlace = "mfa";
            else if ((await toastLogin.count()) > 0) desenlace = "rechazo";
            return desenlace;
          },
          { message: "el login no terminó, no ofreció MFA ni mostró error", timeout: 60_000 },
        )
        .not.toBe("");
      if (desenlace === "rechazo") {
        throw new Error(`login rechazado: ${(await toastLogin.first().innerText()).trim()}`);
      }
      if (desenlace === "mfa") {
        await sinMfa.click();
        await page.waitForURL(fueraDeLogin, { timeout: 60_000 });
      }
      // `/select-branch`: primero la empresa y luego la sucursal. Las dos son
      // tarjetas `<button>` con un `<h3>`. La rejilla que no toca NO sale del
      // DOM: se queda con `opacity-0 pointer-events-none` (y para Playwright
      // opacidad 0 sigue siendo "visible"), así que las tarjetas elegibles son
      // las que no cuelgan de un `.pointer-events-none`. Una empresa sin
      // sucursales ofrece "Continuar con la empresa".
      const tarjetas = page.locator(
        "button:has(h3):not(.pointer-events-none *):not([disabled])",
      );
      const continuar = page.getByRole("button", { name: "Continuar con la empresa" });
      const fueraDeSelect = (url: URL) => !url.pathname.startsWith("/select-branch");
      for (let intento = 0; intento < 4 && page.url().includes("/select-branch"); intento += 1) {
        await expect(tarjetas.or(continuar).first()).toBeVisible({ timeout: 30_000 });
        if (await continuar.isVisible()) {
          await continuar.click();
        } else {
          const elegida = (await tarjetas.first().innerText()).trim();
          await tarjetas.first().click();
          // Se espera a que la elección SURTA efecto —salir de la página o que
          // la primera tarjeta elegible ya sea otra (la rejilla cambió)— antes
          // de volver a mirar, para no pulsar dos veces la misma empresa.
          await expect
            .poll(
              async () =>
                fueraDeSelect(new URL(page.url())) ||
                ((await tarjetas.count()) > 0 &&
                  (await tarjetas.first().innerText()).trim() !== elegida) ||
                (await continuar.isVisible()),
              { timeout: 30_000 },
            )
            .toBe(true);
        }
        await page.waitForURL(fueraDeSelect, { timeout: 5_000 }).catch(() => {});
      }
    } else {
      console.log(`
  ┌──────────────────────────────────────────────────────────────┐
  │  PAUSA — entra a mano en la ventana del navegador:           │
  │    1. Captura usuario y contraseña (y MFA si aplica).        │
  │    2. Si te manda a /select-branch, elige empresa/sucursal.  │
  │    3. Pulsa ▶ "Resume" en el Playwright Inspector.           │
  └──────────────────────────────────────────────────────────────┘`);
      await page.pause();
    }

    // Tras el login (o el resume): cualquier ruta sirve mientras NO sea login ni la
    // selección de sucursal — el `proxy.ts` reenvía ahí a quien no tenga
    // sesión o workspace, así que seguir en ellas significa login incompleto.
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page).not.toHaveURL(/\/select-branch/);
    console.log(`  Sesión iniciada — URL actual: ${page.url()}`);
    console.log(`  Término de búsqueda: "${QUERY}" (cámbialo con SEARCH_QUERY=...)`);
  });

  // ── Paso 1: el botón abre desde dos rutas distintas de (Main) ─────────────
  await runStep("Paso 1 · El botón del header abre la paleta desde dos rutas de (Main)", async () => {
    // Ruta 1: el Home. Está en el matcher del proxy pero no tiene regla de
    // permiso, así que es la única ruta garantizada para CUALQUIER cuenta.
    await empezarEnHome();
    await abrirPaleta();
    rutasProbadas.push("/");
    await shot(page, "search-01-paleta-abierta.png");
    await cerrarPaleta();

    // Ruta 2: la primera entrada del sidebar. Se toma de ahí en vez de fijar
    // una ruta concreta porque el sidebar solo lista lo que ESTA cuenta puede
    // ver — cualquier ruta hardcodeada fallaría con el rol equivocado.
    const enlaces = page.getByRole("navigation").getByRole("link");
    const hrefs = await enlaces.evaluateAll((nodos) =>
      nodos.map((n) => (n as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    const segunda = hrefs.find((href) => href.startsWith("/") && href !== "/");

    if (!segunda) {
      // Cuenta sin ningún módulo en el sidebar: no hay segunda ruta que probar.
      console.log("  ⚠ El sidebar no ofrece ninguna ruta de módulo: se prueba solo /");
      return;
    }

    await page.goto(segunda);
    // Si el proxy rebotara, la segunda ruta no sería válida para esta cuenta.
    expect(new URL(page.url()).pathname, "el sidebar ofreció una ruta que el proxy rechaza").toBe(
      segunda,
    );
    await abrirPaleta();
    rutasProbadas.push(segunda);
    await cerrarPaleta();
    console.log(`  Rutas probadas: ${rutasProbadas.join(" · ")}`);
  });

  // ── Paso 2: el disparador — rótulo, tooltip y foco inicial ────────────────
  await runStep("Paso 2 · El disparador: rótulo accesible, tooltip y foco inicial", async () => {
    await empezarEnHome();

    // El disparador es un icono compacto (como la campana de notificaciones):
    // sin texto a la vista. Su nombre accesible es "Buscar en el sistema" a
    // secas —es justo lo que localiza `disparador`, así que el propio
    // `toBeVisible` de arriba ya lo demuestra— y el tooltip nativo es "Buscar".
    await expect(disparador).toHaveAttribute("title", "Buscar");
    await disparador.hover();
    await shot(page, "search-02-boton-header.png");

    await abrirPaleta();

    // El foco arranca en el input: en una paleta se escribe de inmediato.
    await expect(campo).toBeFocused();
    await cerrarPaleta();
  });

  // ── Paso 3: Esc cierra la paleta ──────────────────────────────────────────
  await runStep("Paso 3 · Esc cierra la paleta", async () => {
    await empezarEnHome();
    await abrirPaleta();
    // `cerrarPaleta` pulsa Escape y exige que desaparezca. El Escape lo maneja
    // el propio diálogo de Radix, no ningún listener global.
    await cerrarPaleta();
  });

  // ── Paso 4: longitud mínima ───────────────────────────────────────────────
  await runStep("Paso 4 · Longitud mínima: pista, sin petición, y nota de códigos", async () => {
    await empezarEnHome();
    await abrirPaleta();

    // 4a · Por debajo del mínimo: pista visible y NI UNA petición al endpoint.
    const peticiones: string[] = [];
    // La referencia se guarda en una constante: `page.off` compara por
    // identidad, así que pasarle una flecha nueva no desengancharía nada.
    const escucha = (request: { url(): string }) => {
      if (esPeticionDeBusqueda(request.url())) peticiones.push(request.url());
    };
    page.on("request", escucha);

    await campo.fill("a");
    await page.waitForTimeout(ESPERA_SIN_PETICION);

    const pista = paleta.getByText(/Escribe al menos \d+ caracteres para buscar/);
    await expect(pista).toBeVisible();
    const textoPista = await pista.innerText();
    console.log(`  Pista: "${textoPista.trim()}"`);
    // El número de la pista sale de `longitud_minima` (o del default del front
    // mientras no hay respuesta): se comprueba contra el contrato.
    expect.soft(textoPista).toContain(String(MIN_LEN));
    expect(
      peticiones.length,
      `con 1 carácter no debe salir ninguna petición (salieron ${peticiones.length})`,
    ).toBe(0);
    await shot(page, "search-03-longitud-minima.png");

    // 4b · Justo en el mínimo (2): sí consulta, pero el backend solo mira
    // códigos/folios — y la paleta lo advierte.
    await campo.fill(QUERY.slice(0, MIN_LEN));
    await expect
      .poll(() => peticiones.length, {
        message: "con la longitud mínima sí debe salir la petición",
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
    await expect(
      paleta.getByText(/solo se buscan códigos y folios/),
      "con menos caracteres que `longitud_minima_nombre` la paleta debe advertirlo",
    ).toBeVisible();

    page.off("request", escucha);

    // 4c · Con el término completo (≥ longitud_minima_nombre) hay búsqueda por
    // nombre y la paleta resuelve.
    expect(
      QUERY.length,
      `SEARCH_QUERY="${QUERY}" es más corto que longitud_minima_nombre (${MIN_LEN_NOMBRE})`,
    ).toBeGreaterThanOrEqual(MIN_LEN_NOMBRE);
    await buscar(QUERY);
    await expect(paleta.getByText(/solo se buscan códigos y folios/)).toBeHidden();
    await shot(page, "search-04-resultados.png");

    await cerrarPaleta();
  });

  // ── Paso 5: grupos variables + navegación por teclado ─────────────────────
  await runStep("Paso 5 · Grupos variables y navegación por índice plano", async () => {
    await empezarEnHome();
    await abrirPaleta();
    await buscar(QUERY);

    const total = await opciones.count();
    const numGrupos = await grupos.count();
    etiquetasVisibles = await paleta.getByRole("heading", { level: 3 }).allInnerTexts();
    tiposVisibles = [];
    filasPorTipo = {};
    for (let i = 0; i < numGrupos; i += 1) {
      const tipo = await tipoDeGrupo(grupos.nth(i));
      tiposVisibles.push(tipo);
      filasPorTipo[tipo] = await grupos.nth(i).getByRole("option").count();
      // La paleta oculta los grupos que el backend manda vacíos (entidad visible
      // para la cuenta, sin coincidencias): todo grupo pintado trae filas.
      expect
        .soft(filasPorTipo[tipo], `el grupo "${tipo}" se pintó sin filas`)
        .toBeGreaterThan(0);
    }
    console.log(
      `  Grupos pintados para esta cuenta: ${numGrupos}` +
        (numGrupos ? ` → ${describirGrupos()} (${etiquetasVisibles.join(" · ")})` : ""),
    );
    console.log(`  Filas totales: ${total}`);

    if (total === 0) {
      // Cuenta sin permisos de búsqueda, o término sin coincidencias. No es un
      // fallo de la paleta: se deja constancia y se sale sin afirmar nada más.
      console.log(`  ⚠ Sin resultados para "${QUERY}": prueba con otro SEARCH_QUERY`);
      await expect(paleta.getByText(/Sin resultados para/)).toBeVisible();
      await cerrarPaleta();
      return;
    }

    // Cada grupo pintado debe traer su encabezado y su `tipo`: es lo que hace la
    // prueba agnóstica del rol —no importa si son 1, 3 o los ~16 futuros—.
    expect(numGrupos, "con filas debe haber al menos un grupo").toBeGreaterThan(0);
    expect(etiquetasVisibles.length).toBe(numGrupos);
    for (const tipo of tiposVisibles) {
      expect(tipo, "cada grupo debe exponer su tipo en aria-labelledby").not.toBe("");
    }

    // La primera fila arranca resaltada, para que Enter abra el mejor resultado
    // sin pulsar ↓ antes.
    await expect(activa).toHaveCount(1);
    await expect(activa).toHaveAttribute("id", "global-search-option-0");

    // ↓ avanza por el índice PLANO, que numera las filas en el mismo orden en
    // que se pintan, atravesando los grupos.
    await campo.press("ArrowDown");
    await expect(activa).toHaveAttribute("id", `global-search-option-${Math.min(1, total - 1)}`);

    // ↑ desde la primera da la vuelta a la última (circular).
    await campo.press("ArrowUp");
    await expect(activa).toHaveAttribute("id", "global-search-option-0");
    await campo.press("ArrowUp");
    await expect(activa).toHaveAttribute("id", `global-search-option-${total - 1}`);
    await campo.press("ArrowDown");
    await expect(activa).toHaveAttribute("id", "global-search-option-0");

    // Cruce de grupos: bajar tantas veces como filas tenga el primer grupo debe
    // dejar el resaltado en la PRIMERA fila del segundo grupo.
    if (numGrupos >= 2) {
      const enPrimerGrupo = await grupos.nth(0).getByRole("option").count();
      for (let i = 0; i < enPrimerGrupo; i += 1) await campo.press("ArrowDown");
      await expect(activa).toHaveAttribute("id", `global-search-option-${enPrimerGrupo}`);
      // Y esa fila pertenece de verdad al segundo grupo.
      await expect(grupos.nth(1).getByRole("option", { selected: true })).toHaveCount(1);
      console.log(`  Cruce de grupos OK (primer grupo: ${enPrimerGrupo} fila/s)`);
      await shot(page, "search-05-navegacion-teclado.png");
    } else {
      console.log("  Solo un grupo: no hay frontera entre grupos que cruzar");
    }

    // El ratón también manda: pasar el cursor por una fila la activa.
    await opciones.nth(total - 1).hover();
    await expect(activa).toHaveAttribute("id", `global-search-option-${total - 1}`);

    await cerrarPaleta();
  });

  // ── Paso 5b: término sin coincidencias ────────────────────────────────────
  // Todos los grupos llegan vacíos (o no llega ninguno): la paleta no pinta
  // encabezados sueltos y muestra el estado vacío.
  await runStep("Paso 5b · Término sin coincidencias: estado vacío sin grupos", async () => {
    await empezarEnHome();
    await abrirPaleta();
    await buscar(SIN_COINCIDENCIAS);
    await expect(paleta.getByText(/Sin resultados para/)).toBeVisible();
    await expect(grupos, "no debe pintarse ningún grupo").toHaveCount(0);
    await expect(paleta.getByRole("heading", { level: 3 })).toHaveCount(0);
    await expect(opciones).toHaveCount(0);
    console.log(`  "${SIN_COINCIDENCIAS}" → estado vacío, 0 grupos pintados`);
    await shot(page, "search-05b-sin-coincidencias.png");
    await cerrarPaleta();
  });

  // ── Paso 6: aperturas por tipo ────────────────────────────────────────────
  if (tiposVisibles.length === 0) {
    skipStep(
      "Paso 6 · Aperturas (pedido / cliente / cotización / órdenes de bordado, reflejante y corte de manga / factura)",
      `sin grupos con resultados para "${QUERY}" — usa otro SEARCH_QUERY o una cuenta con datos`,
    );
  } else {
    for (const tipo of tiposVisibles) {
      const nombrePaso = `Paso 6 · Apertura de "${tipo}"`;

      // Solo se sabe abrir lo que el frontend mapea hoy, y se le pregunta a la
      // MISMA función que usa la paleta (`getSearchApertura`): una lista copiada
      // aquí se desincronizaría al mapear un tipo nuevo. Un tipo sin apertura
      // (p. ej. `producto`) NO se abre: se comprueba que su fila se pinta como
      // no accionable y que elegirla no cierra la paleta ni navega.
      if (getSearchApertura(tipo) === null) {
        await runStep(`${nombrePaso} (no accionable)`, async () => {
          await empezarEnHome();
          await abrirPaleta();
          await buscar(QUERY);
          const fila = paleta
            .locator(`[aria-labelledby="global-search-group-${tipo}"]`)
            .getByRole("option")
            .first();
          if ((await fila.count()) === 0) {
            throw new Error(`el grupo "${tipo}" ya no trae filas en esta segunda búsqueda`);
          }
          await expect(fila).toHaveAttribute("aria-disabled", "true");
          await expect(fila).toContainText("No disponible");
          // `dispatchEvent` y no `click()`: Playwright cuenta `aria-disabled`
          // como deshabilitado y `click()` esperaría hasta el timeout. Lo que se
          // prueba es justo que el `onClick` de la fila no haga nada.
          await fila.dispatchEvent("click");
          await expect(paleta, "una fila no accionable no cierra la paleta").toBeVisible();
          await expect(page, "una fila no accionable no navega").toHaveURL(/\/$/);
          await cerrarPaleta();
        });
        continue;
      }

      await runStep(nombrePaso, async () => {
        await empezarEnHome();
        await abrirPaleta();
        await buscar(QUERY);

        const grupo = paleta.locator(
          `[aria-labelledby="global-search-group-${tipo}"]`,
        );
        const fila = grupo.getByRole("option").first();
        if ((await fila.count()) === 0) {
          throw new Error(`el grupo "${tipo}" ya no trae filas en esta segunda búsqueda`);
        }
        const rotuloFila = (await fila.innerText()).split("\n")[0].trim();
        console.log(`  Fila elegida: "${rotuloFila}"`);
        // `codigo` de la fila (el folio, en monoespaciada). Se lee ANTES de
        // elegirla: la paleta se desmonta al navegar.
        const codigoFila = (
          await fila
            .locator(".font-mono")
            .first()
            .innerText()
            .catch(() => "")
        ).trim();

        await fila.click();

        if (tipo === "pedido") {
          await expect(paleta).toBeHidden({ timeout: 15_000 });
          // Si no se llega, se distingue el fallo real: cuando el proxy rebota
          // al Home es que a la cuenta le faltan los 9 códigos de la regla
          // "/orders", no que la paleta haya navegado mal.
          const llego = await page
            .waitForURL(/\/orders\/\d+/, { timeout: 20_000 })
            .then(() => true)
            .catch(() => false);
          if (!llego) {
            throw new Error(
              `no se llegó a /orders/<id> — URL actual: ${page.url()}` +
                (new URL(page.url()).pathname === "/"
                  ? ". El proxy rebotó al Home: la cuenta no tiene ninguno de los 9 códigos de la regla /orders (routePermissions.ts)"
                  : ""),
            );
          }
          console.log(`  → ${page.url()}`);
          await shot(page, "search-06-apertura-pedido.png");
          return;
        }

        if (tipo === "cliente") {
          await expect(paleta).toBeHidden({ timeout: 15_000 });
          await expect(page).toHaveURL(/\/sales\/customers\/\d+/, { timeout: 20_000 });
          console.log(`  → ${page.url()}`);
          await shot(page, "search-07-apertura-cliente.png");
          return;
        }

        // `Object.hasOwn`, igual que `getSearchApertura`: el `tipo` sale del DOM
        // y un `constructor` resolvería a una función heredada (truthy).
        const ordenProduccion = Object.hasOwn(ORDENES_PRODUCCION, tipo)
          ? ORDENES_PRODUCCION[tipo]
          : undefined;
        if (ordenProduccion) {
          // El backend solo manda estos grupos con el código de sección que
          // exige la ruta (`R-PRODUCCION-OB/OR/CM`, `R-CONTABILIDAD-FACTURACION`):
          // un rebote al Home sería un desajuste.
          const { listado, volver } = ordenProduccion;
          await expect(paleta).toBeHidden({ timeout: 15_000 });
          await expect(page).toHaveURL(new RegExp(`${listado}/\\d+`), { timeout: 20_000 });
          console.log(`  → ${page.url()}`);
          // La URL y el "Volver" también existen en los estados de carga y de
          // ERROR de la página: sin esto, un detalle roto (404/403) pasaría. El
          // folio de la fila solo se pinta con el detalle cargado.
          expect(codigoFila, "la fila de una orden debe traer su folio").not.toBe("");
          await expect(
            page.getByText(codigoFila, { exact: true }).first(),
            `el detalle debe mostrar el folio ${codigoFila}`,
          ).toBeVisible({ timeout: 20_000 });
          console.log(`  Folio en el detalle: ${codigoFila}`);
          await shot(page, `search-07b-apertura-${tipo}.png`);

          // "Volver" fijo al listado del módulo (mismo código de sección).
          volverOrdenes[tipo] = "FAIL";
          await page.getByRole("link", { name: volver }).click();
          await expect(page).toHaveURL(new RegExp(`${listado}/?(\\?.*)?$`), {
            timeout: 20_000,
          });
          volverOrdenes[tipo] = "PASS";
          console.log(`  Volver → ${page.url()}`);
          return;
        }

        // ── cotizacion: NO es ruta, es diálogo ──────────────────────────────
        // Aquí vive el riesgo de los dos diálogos de Radix apilados: la paleta
        // se cierra y, tras un respiro, se monta el detalle. Se comprueba que la
        // secuencia deja la página utilizable.
        await expect(paleta, "la paleta debe cerrarse antes de abrir el detalle").toBeHidden({
          timeout: 15_000,
        });
        const dialogoDetalle = dialogoCotizacion;
        await expect(page, `abrir "${tipo}" no debe navegar`).toHaveURL(/\/$/);
        await expect(dialogoDetalle).toBeVisible({ timeout: 20_000 });

        // El vigilante solo tiene sentido con el detalle YA resuelto: se espera
        // a que acabe la carga y se exige que no esté en su estado de error
        // (eso sería un fallo de apertura, no un destello).
        const textos = TEXTO_DETALLE[tipo];
        await expect(textos.cargando(dialogoDetalle)).toHaveCount(0, { timeout: 20_000 });
        await expect(
          dialogoDetalle.getByText(textos.error),
          `el detalle de "${tipo}" abrió en su estado de error`,
        ).toHaveCount(0);

        // Con el diálogo ABIERTO el body está bloqueado a propósito (Radix
        // aísla el fondo), así que lo que se afirma es que el diálogo en sí
        // responde: su botón de cierre es visible y utilizable.
        const cerrar = dialogoDetalle.getByRole("button", { name: "Cerrar", exact: true });
        await expect(cerrar).toBeVisible();
        await expect(cerrar).toBeEnabled();
        await shot(page, `search-08-apertura-${tipo}.png`);

        // Solo puede haber UN diálogo vivo: si la paleta siguiera montada,
        // habría dos y el fondo quedaría bloqueado dos veces.
        await expect(page.getByRole("dialog")).toHaveCount(1);

        await vigilarTexto(page, textos.error);
        await cerrar.click();
        await expect(dialogoDetalle).toBeHidden({ timeout: 15_000 });
        // "Del todo desaparecido": ningún `dialog` en el DOM (Radix lo desmonta
        // al terminar la animación de salida).
        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
        const destello = await cortarVigilancia(page);
        destellos[tipo] = destello;
        console.log(`  Destello de error al cerrar (${tipo}): ${destello ? "SÍ" : "no"}`);
        expect
          .soft(destello, `el texto "${textos.error}" destelló al cerrar el detalle de "${tipo}"`)
          .toBe(false);

        // Y AHORA sí: la página debe haber quedado limpia.
        await expect
          .poll(async () => (await estadoBody(page)).pointerEvents, {
            message: "el body quedó inerte (pointer-events: none) tras cerrar el detalle",
            timeout: 10_000,
          })
          .not.toBe("none");
        const estado = await estadoBody(page);
        console.log(
          `  Body tras cerrar — pointer-events: ${estado.pointerEvents} · overflow: ${estado.overflow} · aria-hidden: ${estado.ariaHidden ?? "(ninguno)"}`,
        );
        expect.soft(estado.overflow, "el scroll debe desbloquearse al cerrar").not.toBe("hidden");
        expect.soft(estado.ariaHidden, "el body no debe quedar oculto para lectores").toBeNull();

        // Prueba dura de interactividad: si la página estuviera inerte, el
        // botón del header no respondería al clic y la paleta no volvería a
        // abrirse.
        await abrirPaleta();
        await cerrarPaleta();
        console.log("  La página sigue viva tras cerrar el detalle");
      });
    }
  }

  // ── Cierre ────────────────────────────────────────────────────────────────
  await shot(page, "search-09-estado-final.png");

  const ancho = Math.max(...results.map((r) => r.step.length));
  console.log("\n" + "═".repeat(ancho + 30));
  console.log("RESUMEN — búsqueda global");
  console.log("═".repeat(ancho + 30));
  console.log(`Término:          "${QUERY}"`);
  console.log(`Rutas probadas:   ${rutasProbadas.join(" · ") || "—"}`);
  console.log(
    `Grupos de la cuenta: ${
      tiposVisibles.length ? `${describirGrupos()} (${etiquetasVisibles.join(" · ")})` : "—"
    }`,
  );
  console.log(
    `Destello al cerrar: ${
      Object.entries(destellos)
        .map(([t, d]) => `${t}=${d ? "SÍ" : "no"}`)
        .join(" · ") || "— (ningún diálogo probado)"
    }`,
  );
  console.log(
    `Volver de órdenes: ${
      Object.entries(volverOrdenes)
        .map(([t, r]) => `${t}=${r}`)
        .join(" · ") || "— (no probado)"
    }`,
  );
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
