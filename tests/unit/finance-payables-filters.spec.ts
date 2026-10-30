import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { harness } from "./support/headerFilterHarness";
import {
  getColumns as getSupplierInvoiceColumns,
  SUPPLIER_INVOICE_HEADER_FILTERS,
} from "@/src/features/supplier-invoices/components/SupplierInvoiceColumns";
import {
  getAccountsPayableHeaderFilters,
  getColumns as getAccountsPayableColumns,
} from "@/src/features/accounts-payable/components/AccountsPayableColumns";
import {
  getColumns as getPaymentColumns,
  PAYMENT_HEADER_FILTERS,
} from "@/src/features/payments/components/PaymentColumns";
import { METODO_PAGO_OPTIONS } from "@/src/features/payments/constants/paymentStatus";
import type { FacturaProveedor } from "@/src/features/supplier-invoices/interfaces/supplier-invoice.interface";
import type { CuentaPorPagar } from "@/src/features/accounts-payable/interfaces/accounts-payable.interface";
import type { Pago } from "@/src/features/payments/interfaces/payment.interface";

/**
 * Pruebas unitarias de EC-675 sobre cuentas por pagar (facturas de proveedor,
 * CxP y pagos): las opciones y fichas de cada filtro de encabezado. Se leen el
 * `filterFn`, el accessor y las props del `FilterHeader`, sin renderizar nada.
 */

const labels = (options: { label: string }[]) => options.map((o) => o.label);

test.describe("facturas de proveedor", () => {
  const rows = [
    { id: 1, folio: "A-1", estatus: "Borrador", oc: 7, oc_folio: null, recepcion_folio: "RC-1", fecha_emision: "2026-10-02", fecha_vencimiento: null },
    { id: 2, folio: "A-2", estatus: "Registrada", oc: 8, oc_folio: "OC-1-8", recepcion_folio: "RC-2", fecha_emision: "2026-09-15", fecha_vencimiento: "2026-11-01" },
    { id: 3, folio: null, estatus: "Rara", oc: 8, oc_folio: "OC-1-8", recepcion_folio: "RC-2", fecha_emision: "2026-10-20", fecha_vencimiento: "2026-11-30" },
  ] as unknown as FacturaProveedor[];
  const t = harness<FacturaProveedor>(
    withHeaderFilters(getSupplierInvoiceColumns() as ColumnDef<FacturaProveedor, unknown>[], rows, SUPPLIER_INVOICE_HEADER_FILTERS),
    rows,
  );

  test("el folio filtra por `estatus`: el catálogo completo y al final el valor desconocido, crudo", () => {
    expect(labels(t.options("folio"))).toEqual(["Todos", "Borrador", "Registrada", "Cancelada", "Rara"]);
    expect(t.column("folio").meta?.filterLabel).toBe("Estatus");
    expect(t.matching("folio", "Registrada").map((r) => r.id)).toEqual([2]);
  });

  test("la OC sale de las filas con el mismo texto que la celda (`OC #id` sin folio)", () => {
    expect(labels(t.options("oc_folio"))).toEqual(["Todos", "OC #7", "OC-1-8"]);
    expect(t.matching("oc_folio", "OC-1-8").map((r) => r.id)).toEqual([2, 3]);
  });

  test("el vencimiento filtra por mes y agrupa aparte las facturas sin fecha", () => {
    expect(labels(t.options("fecha_vencimiento"))).toContain("Sin vencimiento");
  });
});

test.describe("cuentas por pagar: «Vencida / Al corriente»", () => {
  const today = "2026-10-30";
  const base = { moneda_codigo: "MXN", total_pagado: "0.00", proveedor_nombre: "ACME", fecha_emision: "2026-09-01" };
  const rows = [
    { ...base, id: 1, estatus: "Pendiente", saldo: "100.00", fecha_vencimiento: "2026-10-29" },
    { ...base, id: 2, estatus: "Parcial", saldo: "50.00", fecha_vencimiento: "2026-10-30" },
    { ...base, id: 3, estatus: "Pagada", saldo: "0.00", fecha_vencimiento: "2026-10-01" },
    { ...base, id: 4, estatus: "Cancelada", saldo: "100.00", fecha_vencimiento: "2026-10-01" },
    { ...base, id: 5, estatus: "Pendiente", saldo: "100.00", fecha_vencimiento: null },
  ] as unknown as CuentaPorPagar[];
  const t = harness<CuentaPorPagar>(
    withHeaderFilters(
      getAccountsPayableColumns() as ColumnDef<CuentaPorPagar, unknown>[],
      rows,
      getAccountsPayableHeaderFilters(today),
    ),
    rows,
  );

  test("el vencimiento ofrece Vencida / Al corriente con la regla de `isCuentaPorPagarVencida`", () => {
    expect(labels(t.options("fecha_vencimiento"))).toEqual(["Todos", "Vencida", "Al corriente"]);
    // Estricto: la que vence HOY aún no está vencida; pagada, cancelada o sin
    // vencimiento cuentan como al corriente.
    expect(t.matching("fecha_vencimiento", "si").map((r) => r.id)).toEqual([1]);
    expect(t.matching("fecha_vencimiento", "no").map((r) => r.id)).toEqual([2, 3, 4, 5]);
  });

  test("el `#id` filtra por `estatus` con ficha Estatus", () => {
    expect(labels(t.options("id"))).toEqual(["Todos", "Pendiente", "Parcial", "Pagada", "Cancelada"]);
    expect(t.column("id").meta?.filterLabel).toBe("Estatus");
  });
});

test.describe("pagos", () => {
  const rows = [
    { id: 1, estatus: "Aplicado", metodo_pago: "Cheque", proveedor_nombre: "ACME", cuenta_bancaria_alias: null, fecha_pago: "2026-10-01" },
    { id: 2, estatus: "Cancelado", metodo_pago: "Transferencia", proveedor_nombre: "ACME", cuenta_bancaria_alias: "OPERACIÓN", fecha_pago: "2026-10-02" },
  ] as unknown as Pago[];
  const t = harness<Pago>(
    withHeaderFilters(getPaymentColumns() as ColumnDef<Pago, unknown>[], rows, PAYMENT_HEADER_FILTERS),
    rows,
  );

  test("el método ofrece la MISMA lista que el alta, en su orden, aunque ninguna fila la use", () => {
    expect(labels(t.options("metodo_pago"))).toEqual(["Todos", ...METODO_PAGO_OPTIONS.map((o) => o.label)]);
    expect(t.column("metodo_pago").meta?.filterLabel).toBe("Método de pago");
  });

  test("la cuenta bancaria sin alias va primero como «Sin cuenta»", () => {
    expect(labels(t.options("cuenta_bancaria_alias"))).toEqual(["Todos", "Sin cuenta", "OPERACIÓN"]);
    expect(t.matching("cuenta_bancaria_alias", t.options("cuenta_bancaria_alias")[1].value as string).map((r) => r.id)).toEqual([1]);
  });
});
