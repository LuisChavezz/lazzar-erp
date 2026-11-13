import { expect, test } from "@playwright/test";
import { createElement, type ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { toReactElement } from "./support/pwJsx";

/**
 * EC-887 (revisión): `ServerSearchSelectList` con resultados locales y filas
 * fijadas. Se renderiza el componente real en el servidor y se lee el HTML.
 *
 * - Las coincidencias locales (`localResults`, p. ej. las muestras del alta de
 *   OP) se ven y se pueden elegir aunque la búsqueda del servidor cargue o falle.
 * - `getItemDisabledReason` nunca deshabilita una fila fijada: lo elegido
 *   siempre se puede quitar.
 */

interface Item {
  id: string;
  nombre: string;
  bloqueado: boolean;
}

const item = (id: string, bloqueado = false): Item => ({ id, nombre: `Fila ${id}`, bloqueado });

type Props = ComponentProps<typeof ServerSearchSelectList<Item>>;

const render = (overrides: Partial<Props>) => {
  const props: Props = {
    search: "",
    onSearchChange: () => {},
    searchPlaceholder: "Buscar...",
    results: [],
    pinned: [],
    getKey: (row) => row.id,
    isSelected: () => false,
    onSelect: () => {},
    renderIndicator: () => null,
    renderContent: (row) => createElement("span", { "data-row": row.id }, row.nombre),
    hasResults: true,
    isInitialError: false,
    isSearching: false,
    onRetry: () => {},
    total: 0,
    emptyMessage: "VACIO",
    noResultsMessage: "SIN-COINCIDENCIAS",
    errorMessage: "ERROR-SERVIDOR",
    getItemDisabledReason: (row) => (row.bloqueado ? "MOTIVO-BLOQUEO" : null),
    ...overrides,
  };
  return renderToString(toReactElement(createElement(ServerSearchSelectList<Item>, props)));
};

/** El `<button>` de la fila `id` (cada fila es un botón que envuelve su contenido). */
const rowButton = (html: string, id: string) => {
  const at = html.indexOf(`data-row="${id}"`);
  expect(at).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<button", at);
  return html.slice(start, html.indexOf(">", start) + 1);
};

test.describe("ServerSearchSelectList — resultados locales", () => {
  test("stay visible and selectable while the server search fails", () => {
    const html = render({ localResults: [item("m1")], isInitialError: true, hasResults: false });
    expect(html).toContain("ERROR-SERVIDOR");
    expect(rowButton(html, "m1")).not.toContain("aria-disabled");
  });

  test("stay visible while the server search is still loading", () => {
    const html = render({ localResults: [item("m1")], hasResults: false });
    expect(html).toContain("Buscando...");
    expect(html).toContain('data-row="m1"');
  });

  test("do not trigger the empty message when only the server page is empty", () => {
    const html = render({ localResults: [item("m1")], search: "x" });
    expect(html).not.toContain("SIN-COINCIDENCIAS");
    expect(render({ search: "x" })).toContain("SIN-COINCIDENCIAS");
  });

  test("skip a local item that is already pinned", () => {
    const html = render({ localResults: [item("m1")], pinned: [item("m1")] });
    expect(html.split('data-row="m1"').length - 1).toBe(1);
  });
});

test.describe("ServerSearchSelectList — filas fijadas", () => {
  test("a pinned row is never disabled, even when its reason is set", () => {
    const html = render({ pinned: [item("p1", true)], isSelected: (row) => row.id === "p1" });
    expect(rowButton(html, "p1")).not.toContain("aria-disabled");
    expect(html).not.toContain("MOTIVO-BLOQUEO");
  });

  test("a result row keeps its disabled reason", () => {
    const html = render({ results: [item("r1", true)], total: 1 });
    expect(rowButton(html, "r1")).toContain('aria-disabled="true"');
    expect(html).toContain("MOTIVO-BLOQUEO");
  });
});
