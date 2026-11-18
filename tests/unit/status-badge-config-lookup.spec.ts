import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { toReactElement } from "./support/pwJsx";

/**
 * EC-903: `StatusBadge` busca el estatus con `Object.hasOwn`. Antes,
 * `config[status]` resolvía claves heredadas del prototipo (`constructor`,
 * `toString`…) y el badge salía sin estilo en vez del neutro.
 */
const CONFIG: Record<string, StatusBadgeConfigEntry> = {
  activo: { label: "Activo", cls: "bg-emerald-50", dot: "bg-emerald-500" },
};

const render = (status: string, defaultConfig?: Partial<StatusBadgeConfigEntry>) =>
  // El JSX de los componentes llega con la forma de Playwright: `toReactElement`.
  renderToStaticMarkup(toReactElement(StatusBadge({ status, config: CONFIG, defaultConfig })));

test.describe("StatusBadge: búsqueda en la config", () => {
  test("un estatus de la config usa su estilo y etiqueta", () => {
    const html = render("activo");
    expect(html).toContain("bg-emerald-50");
    expect(html).toContain("Activo");
  });

  for (const status of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
    test(`«${status}» (clave del prototipo) cae al neutro`, () => {
      const html = render(status, { label: "Sin estatus" });
      expect(html).toContain("bg-slate-50");
      expect(html).toContain("bg-slate-400");
      expect(html).toContain("Sin estatus");
      expect(html).not.toContain("undefined");
    });
  }

  test("un estatus desconocido sin defaultConfig muestra el texto crudo con el neutro", () => {
    const html = render("otro");
    expect(html).toContain("bg-slate-50");
    expect(html).toContain(">otro<");
  });

  test("un estatus vacío muestra «—»", () => {
    expect(render("")).toContain("—");
  });
});
