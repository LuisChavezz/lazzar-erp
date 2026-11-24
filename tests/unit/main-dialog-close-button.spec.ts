import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { expect, test, type Page } from "@playwright/test";

/**
 * EC-941 (#248): la X de la esquina de `MainDialog` es un botón de verdad.
 * `Dialog.Close` de Radix Themes fusiona sus props sobre su único hijo; si ese
 * hijo vuelve a ser el icono, el "botón" es un `<svg aria-hidden>` sin foco ni
 * teclado, y nada más lo detecta (typecheck y lint pasan).
 *
 * Monta el `MainDialog` REAL en Chromium, sin bundler, como
 * `session-provider-refetch.spec.ts`: un cargador CommonJS mínimo empaqueta lo
 * instalado en `node_modules` y transpila con `typescript` los `.ts`/`.tsx` de
 * `src/` que alcanza (`MainDialog` y lo que importa). Sin CSS: lo que se prueba
 * es el rol, el foco y el teclado, no el aspecto.
 */

const root = process.cwd();
const projectRequire = createRequire(path.join(root, "package.json"));
const SOURCE_EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

const resolveSource = (base: string) => {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  const found = SOURCE_EXTENSIONS.map((ext) => base + ext).find((file) => fs.existsSync(file));
  if (!found) throw new Error(`No se encontró el módulo ${base}`);
  return found;
};

const resolveSpec = (spec: string, fromFile: string) => {
  if (spec.startsWith("@/")) return resolveSource(path.join(root, spec.slice(2)));
  const isSource = /\.tsx?$/.test(fromFile);
  if (isSource && spec.startsWith(".")) return resolveSource(path.join(path.dirname(fromFile), spec));
  return projectRequire.resolve(spec, { paths: [path.dirname(fromFile)] });
};

const readModule = (file: string) => {
  const code = fs.readFileSync(file, "utf8");
  if (!/\.tsx?$/.test(file)) return code;
  return ts.transpileModule(code, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
};

/** Empaqueta los módulos alcanzables desde `entries` en un script para la página. */
const bundle = (entries: string[]) => {
  const modules = new Map<string, { code: string; deps: Record<string, string> }>();
  const queue: string[] = [];
  const enqueue = (file: string) => {
    if (!modules.has(file)) {
      modules.set(file, { code: "", deps: {} });
      queue.push(file);
    }
  };
  const entryIds = entries.map((spec) => {
    const file = resolveSpec(spec, path.join(root, "package.json"));
    enqueue(file);
    return file;
  });
  while (queue.length > 0) {
    const file = queue.shift()!;
    const code = readModule(file);
    const deps: Record<string, string> = {};
    for (const match of code.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
      // Un `require` opcional que no está instalado no se empaqueta: si de
      // verdad se llamara, el cargador fallaría en la página y la prueba con él.
      try {
        deps[match[1]] = resolveSpec(match[1], file);
      } catch {
        continue;
      }
      enqueue(deps[match[1]]);
    }
    modules.set(file, { code, deps });
  }
  const table = [...modules.entries()]
    .map(
      ([id, mod]) =>
        `${JSON.stringify(id)}: { deps: ${JSON.stringify(mod.deps)}, fn: function (module, exports, require) {\n${mod.code}\n} }`
    )
    .join(",\n");
  return `
    window.process = { env: { NODE_ENV: "production" } };
    (function () {
      var defs = {${table}};
      var cache = {};
      function load(id) {
        if (cache[id]) return cache[id].exports;
        var mod = { exports: {} };
        cache[id] = mod;
        defs[id].fn(mod, mod.exports, function (spec) {
          var dep = defs[id].deps[spec];
          if (!dep) throw new Error("Módulo no empaquetado: " + spec);
          return load(dep);
        });
        return mod.exports;
      }
      window.__modules = ${JSON.stringify(entryIds)}.map(load);
    })();
  `;
};

/**
 * Un `MainDialog` controlado y abierto. `withField` pone un campo en el cuerpo
 * (el caso normal: el foco inicial debe caer en él). Cada `onOpenChange` queda
 * en `window.__openChanges`; uno con `false` cierra el diálogo.
 */
const HARNESS = `
  var React = window.__modules[0];
  var ReactDOMClient = window.__modules[1];
  var MainDialog = window.__modules[2].MainDialog;
  window.__openChanges = [];
  function App() {
    var state = React.useState(true);
    var params = new URLSearchParams(location.search);
    var body = params.get("withField") === "1"
      ? React.createElement("input", { name: "primero", "aria-label": "Primer campo" })
      : React.createElement("p", null, "Solo lectura");
    return React.createElement(MainDialog, {
      open: state[0],
      onOpenChange: function (open) { window.__openChanges.push(open); state[1](open); },
      title: "Diálogo de prueba",
      showCloseButton: params.get("footer") !== "0",
    }, body);
  }
  ReactDOMClient.createRoot(document.getElementById("root")).render(React.createElement(App));
`;

const ORIGIN = "http://harness.test";
let script: string | undefined;

const mountDialog = async (page: Page, query: string) => {
  script ??= bundle(["react", "react-dom/client", "@/src/components/MainDialog"]);
  const html = `<!doctype html><html><body><div id="root"></div><script>${script}</script><script>${HARNESS}</script></body></html>`;
  await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: html }));
  await page.goto(`${ORIGIN}/?${query}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
};

/** Elementos que entran en el ciclo de Tab del diálogo, en orden del DOM. */
const tabbableNames = (page: Page) =>
  page.getByRole("dialog").evaluate((dialog) =>
    [...dialog.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")]
      .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled)
      .map((el) => el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName)
  );

test.describe("MainDialog: la X de cierre es un botón (EC-941, #248)", () => {
  test("es un botón con nombre, último del ciclo de Tab, y el foco inicial va al primer campo", async ({ page }) => {
    await mountDialog(page, "withField=1");
    const close = page.getByRole("button", { name: "Cerrar diálogo" });
    await expect(close).toBeVisible();
    await expect(close.locator("svg")).toHaveAttribute("aria-hidden", "true");

    expect(await tabbableNames(page)).toEqual(["Primer campo", "Cerrar", "Cerrar diálogo"]);
    await expect(page.getByRole("textbox", { name: "Primer campo" })).toBeFocused();

    // Shift+Tab desde el primer control da la vuelta hasta la X.
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
  });

  test("Enter sobre la X cierra el diálogo por onOpenChange(false)", async ({ page }) => {
    await mountDialog(page, "withField=1");
    await page.getByRole("button", { name: "Cerrar diálogo" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __openChanges: boolean[] }).__openChanges)).toEqual([false]);
  });

  test("Espacio sobre la X cierra el diálogo por onOpenChange(false)", async ({ page }) => {
    await mountDialog(page, "withField=1");
    await page.getByRole("button", { name: "Cerrar diálogo" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __openChanges: boolean[] }).__openChanges)).toEqual([false]);
  });

  test("sin ningún otro control enfocable, el foco inicial cae en la X (a propósito)", async ({ page }) => {
    await mountDialog(page, "footer=0");
    expect(await tabbableNames(page)).toEqual(["Cerrar diálogo"]);
    await expect(page.getByRole("button", { name: "Cerrar diálogo" })).toBeFocused();
  });
});
