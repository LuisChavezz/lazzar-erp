import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { expect, test, type Page } from "@playwright/test";

/**
 * EC-946: un segundo filtro de servidor en el mismo encabezado
 * (`ColumnHeaderFilter` con `serverFilterKey` e `icon`, el candado de
 * `retenido` junto al embudo de `confirmado` en Folio de Mesa de Control).
 *
 * Monta el `ColumnHeaderFilter` REAL en Chromium, como
 * `main-dialog-close-button.spec.ts` (mismo cargador CommonJS mínimo que
 * transpila con `typescript` lo de `src/`), porque lo que se prueba son los
 * efectos —el aviso de la etiqueta y del recuerdo a la tabla cliente, y el
 * aviso de desarrollo— y `renderToStaticMarkup` no los corre.
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
        `${JSON.stringify(id)}: { deps: ${JSON.stringify(mod.deps)}, fn: function (module, exports, require) {\n${mod.code}\n} }`,
    )
    .join(",\n");
  // `development`: el aviso de `serverFilterKey` desconocido solo existe fuera de producción.
  return `
    window.process = { env: { NODE_ENV: "development" } };
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
 * Encabezado de Folio con dos filtros: el de la columna (`confirmado`, embudo)
 * y el de `serverFilterKey="retenido"` (candado). `?mode=server` los liga a
 * filtros de servidor (`keys` según `?keys=`; cada cambio en
 * `window.__changes`); `?mode=client` es una tabla cliente con la columna
 * filtrada por `"true"`, y anota lo que el encabezado le reporta en
 * `window.__reports` / `window.__remembered`.
 */
const HARNESS = `
  var React = window.__modules[0];
  var ReactDOMClient = window.__modules[1];
  var ColumnHeaderFilter = window.__modules[2].ColumnHeaderFilter;
  var DataTableModeContext = window.__modules[3].DataTableModeContext;
  var LockIcon = window.__modules[4].LockIcon;
  var params = new URLSearchParams(location.search);
  window.__changes = [];
  window.__reports = [];
  window.__remembered = [];
  var column = {
    id: "folio",
    columnDef: { meta: { serverFilter: "confirmado" } },
    getFilterValue: function () { return "true"; },
    setFilterValue: function () {},
  };
  var ALL = { value: undefined, label: "Todos" };
  var CONFIRMADO = [ALL, { value: "false", label: "Por confirmar" }, { value: "true", label: "Confirmado" }];
  var RETENIDO = [ALL, { value: "true", label: "Retenidos" }, { value: "false", label: "No retenidos" }];
  function Header() {
    return React.createElement("div", { id: "th" },
      React.createElement(ColumnHeaderFilter, { column: column, options: CONFIRMADO, label: "estado de confirmación" }),
      React.createElement(ColumnHeaderFilter, {
        column: column, serverFilterKey: "retenido", icon: LockIcon, options: RETENIDO, label: "retención",
      }));
  }
  function App() {
    var state = React.useState(params.get("retenido") ? { retenido: params.get("retenido") } : {});
    var value = params.get("mode") === "client"
      ? {
          mode: "client",
          columnFilters: [{ id: "folio", value: "true" }],
          reportFilterValueLabel: function (id, label) { window.__reports.push([id, label]); },
          rememberFilterOption: function (id, option) { window.__remembered.push([id, option.label]); },
          getRememberedFilterOption: function () { return undefined; },
        }
      : {
          mode: "server",
          filters: {
            values: state[0],
            keys: params.get("keys").split(","),
            onChange: function (key, next) {
              window.__changes.push([key, next === undefined ? null : next]);
              var copy = Object.assign({}, state[0]);
              if (next === undefined) delete copy[key]; else copy[key] = next;
              state[1](copy);
            },
          },
        };
    return React.createElement(DataTableModeContext.Provider, { value: value }, React.createElement(Header));
  }
  ReactDOMClient.createRoot(document.getElementById("root")).render(React.createElement(App));
`;

const ORIGIN = "http://harness.test";
let script: string | undefined;

const mount = async (page: Page, query: string) => {
  script ??= bundle([
    "react",
    "react-dom/client",
    "@/src/components/ColumnHeaderFilter",
    "@/src/components/DataTableModeContext",
    "@/src/components/Icons",
  ]);
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script>${script}</script><script>${HARNESS}</script></body></html>`;
  await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await page.goto(`${ORIGIN}/?${query}`);
  await expect(page.locator("#th")).toBeAttached();
  return warnings;
};

const windowValue = <T,>(page: Page, name: string) =>
  page.evaluate((key) => (window as unknown as Record<string, T>)[key], name);

test.describe("ColumnHeaderFilter con serverFilterKey e icon (EC-946)", () => {
  test("en modo servidor pinta dos íconos distintos y cada uno se liga a su clave", async ({ page }) => {
    await mount(page, "mode=server&keys=confirmado,retenido&retenido=true");
    const confirmado = page.getByRole("button", { name: /^Filtrar por estado de confirmación/ });
    const retencion = page.getByRole("button", { name: /^Filtrar por retención/ });
    await expect(confirmado.locator("svg")).toHaveClass(/lucide-funnel/);
    await expect(retencion.locator("svg")).toHaveClass(/lucide-lock/);
    // Mismo estilo de activo para los dos: aquí solo la retención tiene valor.
    await expect(retencion).toHaveAttribute("data-filter-active", "");
    await expect(confirmado).not.toHaveAttribute("data-filter-active", "");
    await expect(retencion).toHaveAccessibleName("Filtrar por retención (filtro activo: Retenidos)");

    await retencion.click();
    await page.getByRole("menuitemradio", { name: "No retenidos" }).click();
    await confirmado.click();
    await page.getByRole("menuitemradio", { name: "Por confirmar" }).click();
    expect(await windowValue<[string, string | null][]>(page, "__changes")).toEqual([
      ["retenido", "false"],
      ["confirmado", "false"],
    ]);
  });

  test("con una clave que la lista no conoce avisa en desarrollo", async ({ page }) => {
    const warnings = await mount(page, "mode=server&keys=confirmado");
    await expect
      .poll(() => warnings.join("\n"))
      .toContain('[ColumnHeaderFilter] columna "folio": serverFilterKey "retenido" no es un filtro de la lista');
  });

  test("con la clave conocida no avisa", async ({ page }) => {
    const warnings = await mount(page, "mode=server&keys=confirmado,retenido");
    await expect(page.getByRole("button", { name: /^Filtrar por retención/ })).toBeVisible();
    expect(warnings.filter((text) => text.includes("serverFilterKey"))).toEqual([]);
  });

  test("fuera del modo servidor no se pinta ni reporta nada que pise al filtro de la columna", async ({ page }) => {
    await mount(page, "mode=client");
    await expect(page.getByRole("button", { name: /^Filtrar por estado de confirmación/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filtrar por retención/ })).toHaveCount(0);
    // Solo el filtro de la columna reporta su etiqueta y su recuerdo; nunca "Retenidos".
    await expect.poll(() => windowValue<[string, string][]>(page, "__reports")).toContainEqual(["folio", "Confirmado"]);
    const reports = await windowValue<[string, string][]>(page, "__reports");
    const remembered = await windowValue<[string, string][]>(page, "__remembered");
    expect(reports.map(([, label]) => label)).not.toContain("Retenidos");
    expect(remembered).toEqual([["folio", "Confirmado"]]);
  });
});
