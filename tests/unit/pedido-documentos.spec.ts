import { expect, test } from "@playwright/test";
import { resolveInvoiceBack } from "@/src/features/invoicing/constants/invoiceDetailOrigins";
import { cobroRowKey, filaFolio } from "@/src/features/orders/utils/pedidoDocumentos";
import type {
  PedidoDocumentoCobro,
  PedidoDocumentoFila,
} from "@/src/features/orders/interfaces/pedido-documentos.interface";

/** EC-914: hoja "Documentos" del pedido. */

test("el Volver de una factura abierta desde el pedido regresa a la hoja Documentos", () => {
  const back = resolveInvoiceBack({ from: "order", pedido: "2129" }, () => true);
  expect(back).toEqual({ href: "/orders/2129?sheet=documents", label: "Volver al Pedido" });
  // Sin acceso al pedido, vuelve a Facturación.
  expect(resolveInvoiceBack({ from: "order", pedido: "2129" }, () => false).href).toBe(
    "/finance/invoicing",
  );
});

test("un cobro aplicado a dos facturas da dos llaves distintas", () => {
  const cobro = (factura_folio: string | null): PedidoDocumentoCobro => ({
    cobro_id: 9,
    importe_aplicado: 500,
    folio: "COB-00009",
    estatus: "Aplicado",
    fecha: "2026-11-15",
    factura_folio,
    moneda_codigo: "MXN",
  });
  expect(cobroRowKey(cobro("FAC-1"), 0)).not.toBe(cobroRowKey(cobro("FAC-2"), 1));
  // Sin folio de factura, el índice las distingue.
  expect(cobroRowKey(cobro(null), 0)).not.toBe(cobroRowKey(cobro(null), 1));
});

test("la cotización sin folio muestra su id", () => {
  const fila = (folio: string | null): PedidoDocumentoFila => ({
    id: 89,
    folio,
    estatus: 3,
    estatus_label: "AUTORIZADA",
    fecha: "2026-08-21T21:01:10Z",
  });
  expect(filaFolio(fila(null))).toBe("89");
  expect(filaFolio(fila("2026-OB-00024"))).toBe("2026-OB-00024");
});
