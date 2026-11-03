import { expect, test } from "@playwright/test";
import { assertEmailSnapshotUnchanged } from "@/src/features/google/utils/sendEmailFlow";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";
import { invoiceEmailRenderInputs } from "@/src/features/invoicing/utils/invoiceEmailRenderInputs";
import { PURCHASE_ORDER_STATUS } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import type { PurchaseOrderDetail } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { purchaseOrderEmailRenderInputs } from "@/src/features/purchase-orders/utils/purchaseOrderEmailRenderInputs";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { quoteEmailRenderInputs } from "@/src/features/quotes/utils/quoteEmailRenderInputs";

/**
 * Pruebas unitarias de EC-700: al enviar un correo confirmado se compara lo que
 * se RENDERIZA (correo + PDF) de la versión confirmada contra la recién leída.
 * Un cambio que no se ve no aborta; uno que se ve, sí. Corren con
 * `npm run test:unit`.
 */

/** ¿Abortaría el envío al pasar de `prepared` a `current`? */
const aborts = <T>(inputs: (record: T) => unknown, prepared: T, current: T) => {
  // Las entradas se arman FUERA del try: un error al armarlas (p. ej. el
  // esquema rechaza el registro) debe fallar la prueba, no contar como aborto.
  const currentInputs = inputs(current);
  const preparedInputs = inputs(prepared);
  try {
    assertEmailSnapshotUnchanged(currentInputs, preparedInputs, "cambió");
    return false;
  } catch (error) {
    if ((error as Error).message !== "cambió") throw error;
    return true;
  }
};

// ─── Orden de compra ──────────────────────────────────────────────────────────

const order = {
  id: 516,
  folio: "OC-00003-2026",
  referencia: "EC-700",
  fecha_oc: "2026-11-03",
  fecha_entrega_estimada: null,
  proveedor: 8,
  proveedor_nombre: "PRUEBA",
  proveedor_correo: "provtest@g.com",
  observaciones: "OC de prueba",
  tipo: "ODC",
  estatus: PURCHASE_ORDER_STATUS.AUTORIZADA,
  motivo_cancelacion: null,
  total_piezas: 10,
  moneda_codigo: "MXN",
  subtotal: "10.00",
  descuento: "0.00",
  flete: "0.00",
  seguros: "0.00",
  porcentaje_iva: "16.00",
  total_iva: "1.60",
  gran_total: "11.60",
  porcentaje_recibido: null,
  cantidad_recibida: null,
  updated_at: "2026-11-03T08:56:51",
  detalles: [
    {
      id: 1,
      descripcion: "Prueba",
      producto_variante_sku: null,
      producto_variante_color: null,
      producto_variante_talla: null,
      cantidad: 10,
      precio: "1.00",
      descuento: "0.00",
      importe: "10.00",
      cantidad_recibida: 0,
    },
  ],
} as unknown as PurchaseOrderDetail;

const withLine = (patch: Record<string, unknown>) =>
  ({ ...order, detalles: [{ ...order.detalles[0], ...patch }] }) as PurchaseOrderDetail;

test("OC: recibir parcialmente (estatus 3→4, avance, auditoría) no aborta", () => {
  const received = {
    ...withLine({ cantidad_recibida: 4 }),
    estatus: PURCHASE_ORDER_STATUS.PARCIALMENTE_RECIBIDA,
    porcentaje_recibido: "40.00",
    cantidad_recibida: 4,
    updated_at: "2026-11-03T09:30:00",
  } as PurchaseOrderDetail;

  expect(aborts(purchaseOrderEmailRenderInputs, order, received)).toBe(false);
});

test("OC: cualquier dato que se pinta en el correo o el PDF aborta", () => {
  for (const changed of [
    { ...order, observaciones: "Otra nota" },
    { ...order, referencia: "Otra" },
    { ...order, gran_total: "12.00" },
    { ...order, proveedor_correo: "otro@x.com" },
    { ...order, tipo: "OTRO" },
    { ...order, estatus: PURCHASE_ORDER_STATUS.CANCELADA },
    withLine({ precio: "2.00" }),
    withLine({ descuento: "1.00" }),
    withLine({ producto_variante_talla: "M" }),
  ]) {
    expect(aborts(purchaseOrderEmailRenderInputs, order, changed as PurchaseOrderDetail)).toBe(true);
  }
});

// ─── Factura ──────────────────────────────────────────────────────────────────

const invoice = {
  id: 493,
  folio: "F-00097",
  cliente_nombre: "Tester I",
  estatus: "Emitida",
  activo: true,
  fecha_emision: "2026-11-02",
  fecha_vencimiento: null,
  moneda_nombre: "MXN",
  subtotal: "50.00",
  descuento: "0.00",
  impuestos: "8.00",
  total: "58.00",
  observaciones: null,
  correo_facturas: "test@x.com",
  cfdi_uuid: null,
  saldo_pendiente: "58.00",
  updated_at: "2026-11-02T10:00:00",
  factura_detalles: [
    {
      producto_nombre: "Playera",
      talla_nombre: "M",
      porcentaje_impuesto: "16.00",
      cantidad: "1.00",
      precio_unitario: "50.00",
      descuento: "0.00",
      total: "50.00",
    },
  ],
} as unknown as Invoice;

test("factura: pagos, CFDI y auditoría no abortan", () => {
  const changed = {
    ...invoice,
    cfdi_uuid: "ABC-123",
    saldo_pendiente: "0.00",
    updated_at: "2026-11-03T10:00:00",
  } as Invoice;

  expect(aborts(invoiceEmailRenderInputs, invoice, changed)).toBe(false);
});

test("factura: cualquier dato del documento o el destinatario aborta", () => {
  for (const changed of [
    { ...invoice, observaciones: "Nota nueva" },
    { ...invoice, total: "60.00" },
    { ...invoice, correo_facturas: "otro@x.com" },
    { ...invoice, factura_detalles: [{ ...invoice.factura_detalles![0], cantidad: "2.00" }] },
  ]) {
    expect(aborts(invoiceEmailRenderInputs, invoice, changed as Invoice)).toBe(true);
  }
});

// ─── Cotización ───────────────────────────────────────────────────────────────

const quote = {
  id: 301,
  cliente: 47,
  cliente_nombre: "QA",
  cliente_razon_social: "QA SA",
  correo_facturas: "qa@example.invalid",
  estatus_label: "Borrador",
  created_at: "2026-11-03T09:00:00",
  destinatario: "Almacén",
  persona_pagos: "Pagos",
  forma_pago: "99",
  metodo_pago: "PPD",
  uso_cfdi: "G03",
  oc: "",
  iva: 16,
  anticipo: "0.00",
  gran_total: "116.00",
  observaciones: "",
  direccion_envio: "Calle 1",
  colonia_envio: "Centro",
  codigo_postal: "01000",
  ciudad_envio: "CDMX",
  estado_envio: "CDMX",
  updated_at: "2026-11-03T09:00:00",
  vendedor: 4,
  detalles: [
    {
      id: 1,
      producto: 10,
      producto_nombre: "Bata",
      producto_nombre_externo: null,
      precio_unitario: "100.00",
      tallas: [{ talla_nombre: "M", cantidad: 1, sku: "SKU-1", lleva_corte_manga: false }],
    },
  ],
} as unknown as QuoteById;

const quoteInputs = (record: { quote: QuoteById; monedaCodigo: string | null }) =>
  quoteEmailRenderInputs(record.quote, record.monedaCodigo);

test("cotización: vendedor y auditoría no abortan", () => {
  expect(
    aborts(
      quoteInputs,
      { quote, monedaCodigo: "MXN" },
      { quote: { ...quote, vendedor: 5, updated_at: "2026-11-03T10:00:00" } as QuoteById, monedaCodigo: "MXN" },
    ),
  ).toBe(false);
});

test("cotización: cualquier dato que se pinta, el destinatario o la moneda aborta", () => {
  const line = quote.detalles[0];
  for (const changed of [
    { quote: { ...quote, observaciones: "Nota" }, monedaCodigo: "MXN" },
    { quote: { ...quote, correo_facturas: "otro@example.invalid" }, monedaCodigo: "MXN" },
    { quote: { ...quote, metodo_pago: "PUE" }, monedaCodigo: "MXN" },
    { quote: { ...quote, ciudad_envio: "GDL" }, monedaCodigo: "MXN" },
    { quote: { ...quote, detalles: [{ ...line, precio_unitario: "90.00" }] }, monedaCodigo: "MXN" },
    {
      quote: { ...quote, detalles: [{ ...line, tallas: [{ ...line.tallas[0], cantidad: 2 }] }] },
      monedaCodigo: "MXN",
    },
    { quote, monedaCodigo: "USD" },
  ]) {
    expect(
      aborts(quoteInputs, { quote, monedaCodigo: "MXN" }, changed as { quote: QuoteById; monedaCodigo: string }),
    ).toBe(true);
  }
});
