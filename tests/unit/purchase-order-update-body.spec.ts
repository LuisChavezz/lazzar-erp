import { expect, test } from "@playwright/test";
import type { PurchaseOrderEditHeader } from "@/src/features/purchase-orders/schemas/purchase-order-edit.schema";
import { buildPurchaseOrderUpdateBody } from "@/src/features/purchase-orders/utils/buildPurchaseOrderUpdateBody";

/**
 * Body del PUT de la OC (EC-796): `almacen` se decide contra la foto fresca
 * del detalle con la que se sembró el formulario.
 */

const header = (almacen: number): PurchaseOrderEditHeader => ({
  sucursal: 1,
  almacen,
  proveedor: 8,
  moneda: 1,
  fecha_vencimiento: null,
  referencia: "REF",
  observaciones: "",
  tipo_compra: "MP",
  pedidos: [],
});

const detalles = [{ cantidad: 1, precio: "10.00", descripcion: "X", producto: 5 }];

test("almacén sin cambios respecto de la foto: no viaja", () => {
  const body = buildPurchaseOrderUpdateBody({
    header: header(4),
    loaded: { almacen: 4 },
    isTipoCompraLocked: false,
    detalles,
  });
  expect("almacen" in body).toBe(false);
});

test("la foto manda: una fila vieja sin almacén no hace reenviar el guardado", () => {
  // La fila del listado (caché) decía `null`; la foto fresca trae 4 y el
  // formulario se sembró con 4. Contra la foto, no cambió.
  const fromSnapshot = buildPurchaseOrderUpdateBody({
    header: header(4),
    loaded: { almacen: 4 },
    isTipoCompraLocked: false,
    detalles,
  });
  const fromStaleRow = buildPurchaseOrderUpdateBody({
    header: header(4),
    loaded: { almacen: null },
    isTipoCompraLocked: false,
    detalles,
  });
  expect("almacen" in fromSnapshot).toBe(false);
  expect(fromStaleRow.almacen).toBe(4);
});

test("almacén quitado viaja como null, nunca 0", () => {
  const body = buildPurchaseOrderUpdateBody({
    header: header(0),
    loaded: { almacen: 4 },
    isTipoCompraLocked: false,
    detalles,
  });
  expect(body.almacen).toBeNull();
});

test("el resto del body no cambia: tipo_compra solo sin folio, pedidos siempre", () => {
  const locked = buildPurchaseOrderUpdateBody({
    header: header(4),
    loaded: { almacen: 4 },
    isTipoCompraLocked: true,
    detalles,
  });
  expect(locked).toEqual({
    sucursal: 1,
    proveedor: 8,
    moneda: 1,
    fecha_vencimiento: null,
    referencia: "REF",
    observaciones: "",
    pedidos: [],
    detalles,
  });
  const unlocked = buildPurchaseOrderUpdateBody({
    header: header(4),
    loaded: { almacen: 4 },
    isTipoCompraLocked: false,
    detalles,
  });
  expect(unlocked.tipo_compra).toBe("MP");
});
