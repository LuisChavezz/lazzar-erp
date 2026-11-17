import { expect, test } from "@playwright/test";
import type { CellContext } from "@tanstack/react-table";
import { Theme } from "@radix-ui/themes";
import { SessionProvider } from "next-auth/react";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { createSalesOrderColumns } from "@/src/features/orders/components/SalesOrderColumns";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import { toReactElement } from "./support/pwJsx";

/**
 * Pruebas unitarias de EC-755: el menú de fila del folio de "Mis pedidos"
 * siempre tiene nombre accesible. Sin folio, la celda pinta "—" y el menú se
 * nombra con el id del pedido. Se renderiza en el servidor (menú cerrado): basta
 * el botón que lo dispara. La celda es JSX que Playwright compila a su propio
 * formato: `toReactElement` lo devuelve a elementos de React. `ActionMenu` lee la
 * sesión (permisos de cada acción), así que va dentro de un `SessionProvider`
 * sin sesión, y el menú de Radix Themes dentro de su `Theme`. Corren con `npm run test:unit`.
 */

const render = (node: unknown) =>
  renderToStaticMarkup(
    createElement(
      Theme,
      null,
      // `SessionProviderProps` exige `children`; aquí van como tercer argumento.
      createElement(
        SessionProvider,
        { session: null } as Parameters<typeof SessionProvider>[0],
        toReactElement(node),
      ),
    ),
  );

const folioCell = (order: Partial<PedidoListItem>) => {
  const [folioColumn] = createSalesOrderColumns({ from: "sales", showAmounts: false });
  const cell = folioColumn.cell as (context: CellContext<PedidoListItem, unknown>) => ReactNode;
  const context = { row: { original: { id: 2126, estatus: 3, oc: null, ...order } } };
  return render(cell(context as unknown as CellContext<PedidoListItem, unknown>));
};

test.describe("menú del folio de Mis pedidos", () => {
  test("con folio, el menú se nombra con el folio", () => {
    const html = folioCell({ folio: "P-00172-2026" });
    expect(html).toContain('aria-label="Ver acciones de P-00172-2026"');
  });

  test("sin folio, muestra «—» y el menú se nombra con el id del pedido", () => {
    for (const folio of [null, ""]) {
      const html = folioCell({ folio } as Partial<PedidoListItem>);
      expect(html).toContain('aria-label="Ver acciones de pedido #2126"');
      expect(html).toContain("—");
    }
  });

  test("sin `menuLabel`, FolioActionMenu sigue usando el folio (otros listados)", () => {
    const html = render(
      createElement(FolioActionMenu, {
        folio: "OC-1",
        items: [{ label: "Ver detalle", icon: ViewIcon, href: "/x" }],
      }),
    );
    expect(html).toContain('aria-label="Ver acciones de OC-1"');
  });
});
