import { expect, test } from "@playwright/test";
import {
  puedeCancelarSalidaMaquila,
  salidaMaquilaDocumentoEtiqueta,
  tieneRecepcionViva,
} from "@/src/features/maquila-outputs/utils/salidaMaquilaDocumentos";
import { supplierInvoicesHref } from "@/src/features/supplier-invoices/utils/supplierInvoicesListQuery";

/** EC-919: recepciones y facturas de la SM, y cuándo se ofrece cancelarla. */

const rc = (id: number, estatus: number) => ({ id, folio: `RC-${id}`, estatus, fecha_recepcion: null });

test("Cancelar solo en una SM Enviada sin recepciones vivas", () => {
  expect(puedeCancelarSalidaMaquila({ estatus: "ENVIADA", recepciones: [] })).toBe(true);
  expect(puedeCancelarSalidaMaquila({ estatus: "ENVIADA", recepciones: [rc(1, 4)] })).toBe(false);
  // Una recepción cancelada no cuenta.
  expect(puedeCancelarSalidaMaquila({ estatus: "ENVIADA", recepciones: [rc(1, 6)] })).toBe(true);
  expect(puedeCancelarSalidaMaquila({ estatus: "RECIBIDA", recepciones: [] })).toBe(false);
  // Sin `recepciones` (backend anterior) decide el backend, como antes.
  expect(puedeCancelarSalidaMaquila({ estatus: "ENVIADA" })).toBe(true);
  expect(tieneRecepcionViva({ recepciones: [rc(1, 6), rc(2, 5)] })).toBe(true);
});

test("sin folio se nombra por #id", () => {
  expect(salidaMaquilaDocumentoEtiqueta({ id: 1245, folio: null })).toBe("#1245");
  expect(salidaMaquilaDocumentoEtiqueta({ id: 1245, folio: "  " })).toBe("#1245");
  expect(salidaMaquilaDocumentoEtiqueta({ id: 1245, folio: "EC917-1" })).toBe("EC917-1");
});

test("URL del listado de facturas con proveedor, SM y factura", () => {
  expect(supplierInvoicesHref(null)).toBe("/finance/supplier-invoices");
  expect(supplierInvoicesHref(7)).toBe("/finance/supplier-invoices?proveedor=7");
  expect(supplierInvoicesHref(null, { salidaMaquilaId: 45, facturaId: 1245 })).toBe(
    "/finance/supplier-invoices?salida_maquila=45&factura=1245",
  );
});
