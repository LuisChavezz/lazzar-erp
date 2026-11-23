import { expect, test } from "@playwright/test";
import { Theme } from "@radix-ui/themes";
import { SessionProvider } from "next-auth/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentosBlocks } from "@/src/features/orders/components/OrderDocumentsSheet";
import type { PedidoDocumentos } from "@/src/features/orders/interfaces/pedido-documentos.interface";
import { toReactElement } from "./support/pwJsx";

/**
 * EC-923: desde nucleo-erp #1304, `documentos/` manda `salidas_maquila`,
 * `facturas` y `cobros` en `null` a quien no tiene el permiso de su módulo.
 * La hoja no revienta y oculta esos bloques (no los muestra como "Sin
 * registros"); con todas las secciones en lista, los pinta todos.
 *
 * El JSX del componente lo compila el runner a su propio formato:
 * `toReactElement` lo devuelve a elementos de React. Los enlaces de la hoja
 * leen la sesión, así que va dentro de un `SessionProvider` sin sesión (y de
 * `Theme`, por los badges). Corren con `npm run test:unit`.
 */

const docs = (overrides: Partial<PedidoDocumentos> = {}): PedidoDocumentos => ({
  cotizaciones: [],
  ordenes_compra: [],
  pre_ordenes: [],
  ordenes_produccion: [],
  ordenes_bordado: [],
  ordenes_reflejante: [],
  ordenes_corte_manga: [],
  salidas_maquila: [],
  pickings: [],
  packings: [],
  despachos: [],
  envios: [],
  movimientos_inventario: [],
  facturas: [],
  cobros: [],
  ...overrides,
});

const render = (data: PedidoDocumentos) =>
  renderToStaticMarkup(
    createElement(
      Theme,
      null,
      createElement(
        SessionProvider,
        { session: null } as Parameters<typeof SessionProvider>[0],
        toReactElement(
          createElement(DocumentosBlocks, {
            pedidoId: 2129,
            docs: data,
            canOpen: () => false,
            onOpenDoc: () => {},
          }),
        ),
      ),
    ),
  );

test("con todas las secciones en lista se pintan todos los bloques", () => {
  const html = render(docs());
  for (const title of ["Pre-órdenes", "Salidas a maquila", "Surtidos", "Facturación y cobranza", "Facturas", "Cobros"]) {
    expect(html).toContain(title);
  }
});

test("salidas_maquila en null oculta su bloque y deja el resto", () => {
  const html = render(docs({ salidas_maquila: null }));
  expect(html).not.toContain("Salidas a maquila");
  expect(html).not.toContain("Total del documento SM");
  expect(html).toContain("Pre-órdenes");
  expect(html).toContain("Órdenes de producción");
  expect(html).toContain("Facturas");
});

test("sin salidas_maquila, facturas ni cobros no revienta y oculta los tres", () => {
  const html = render(docs({ salidas_maquila: null, facturas: null, cobros: null }));
  expect(html).not.toContain("Salidas a maquila");
  expect(html).not.toContain("Facturación y cobranza");
  expect(html).not.toContain("Cobros");
  expect(html).toContain("Surtidos");
});

test("el total de la SM sigue oculto sin R-PRODUCCION-COSTOS", () => {
  const sm = {
    id: 7,
    folio: "SM-00007",
    estatus: "ENVIADA",
    fecha_envio: "2026-11-20",
    fecha_recepcion: null,
    total_piezas: 10,
    total: null,
    centro_confeccion_nombre: "Maquila Norte",
    op_folio: "OP-1",
    ob_folio: null,
    or_folio: null,
  } as NonNullable<PedidoDocumentos["salidas_maquila"]>[number];
  expect(render(docs({ salidas_maquila: [sm] }))).not.toContain("Total del documento SM");
  expect(render(docs({ salidas_maquila: [{ ...sm, total: 1500 }] }))).toContain("Total del documento SM");
});
