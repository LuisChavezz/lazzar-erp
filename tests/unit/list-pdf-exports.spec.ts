import { expect, test } from "@playwright/test";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { CustomerListItem } from "@/src/features/customers/interfaces/customer.interface";
import { customersPdfProps } from "@/src/features/customers/utils/customerListPdf";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { PedidoExportRow } from "@/src/features/orders/interfaces/pedido-list.interface";
import { procurementOrdersPdfProps } from "@/src/features/orders/utils/procurementOrderListPdf";
import type { PurchaseOrderReceipt } from "@/src/features/purchase-order-receipts/interfaces/purchase-order-receipt.interface";
import { purchaseOrderReceiptsPdfProps } from "@/src/features/purchase-order-receipts/utils/purchaseOrderReceiptListPdf";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { purchaseOrdersPdfProps } from "@/src/features/purchase-orders/utils/purchaseOrderListPdf";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";
import { formatQuoteExportTotal } from "@/src/features/quotes/utils/quoteExportTotals";
import { quotesPdfProps } from "@/src/features/quotes/utils/quoteListPdf";
import type { Supplier } from "@/src/features/suppliers/interfaces/supplier.interface";
import { suppliersPdfProps } from "@/src/features/suppliers/utils/supplierListPdf";

/**
 * Props del PDF de los listados de Ventas y Compras (EC-959): título, anchos
 * de columna (peso relativo, un decimal) y, en cotizaciones, alineación,
 * negritas, "Total general" y la fila de totales bajo la columna de importe.
 * Funciones puras: no maquetan el PDF.
 */

const NOW = new Date("2026-11-25T18:00:00Z");
const col = <T,>(id: string, header = id, accessorKey?: string): DataTableVisibleColumn<T> => ({
  id,
  header,
  ...(accessorKey ? { accessorKey } : {}),
});
const widths = (props: { columns: { width: string }[] }) => props.columns.map((c) => c.width);

test.describe("PDF de los listados de Ventas y Compras", () => {
  test("órdenes de compra: título y O.C./Proveedor/Progreso más anchos", () => {
    const columns = ["folio", "proveedor_nombre", "progreso", "tipo_compra"].map((id) => col<PurchaseOrder>(id));
    const props = purchaseOrdersPdfProps([], columns, NOW);
    expect(props.title).toBe("Reporte de Órdenes de Compra");
    expect(props.variant).toBe("standard");
    expect(widths(props)).toEqual(["29.0%", "29.0%", "25.8%", "16.1%"]);
  });

  test("pedidos de Compras: título y Folio/Cliente más anchos", () => {
    const columns = ["folio", "cliente", "estatus"].map((id) => col<PedidoListItem>(id));
    const props = procurementOrdersPdfProps([] as PedidoExportRow[], columns, NOW);
    expect(props.title).toBe("Reporte de Pedidos");
    expect(widths(props)).toEqual(["34.8%", "43.5%", "21.7%"]);
  });

  test("recepciones de OC: título y Folio/Proveedor más anchos", () => {
    const columns = ["folio", "proveedor_nombre", "almacen"].map((id) => col<PurchaseOrderReceipt>(id));
    const props = purchaseOrderReceiptsPdfProps([], columns, NOW);
    expect(props.title).toBe("Reporte de Recepciones");
    expect(widths(props)).toEqual(["38.1%", "38.1%", "23.8%"]);
  });

  test("proveedores: título y Proveedor/Razón social/Contacto más anchos", () => {
    const columns = ["proveedor", "razon_social", "contacto", "rfc"].map((id) => col<Supplier>(id));
    const props = suppliersPdfProps([], columns, NOW);
    expect(props.title).toBe("Catálogo de Proveedores");
    expect(widths(props)).toEqual(["26.7%", "30.0%", "26.7%", "16.7%"]);
  });

  test("clientes: título, columnas del mismo ancho y — en una celda vacía", () => {
    const columns = ["razon_social", "nombre", "correo"].map((id) => col<CustomerListItem>(id));
    const customer = { id: 1, razon_social: "CLIENTE", nombre: "", correo: "a@b.mx" } as unknown as CustomerListItem;
    const props = customersPdfProps([customer], columns, NOW);
    expect(props.title).toBe("Reporte de Clientes");
    expect(widths(props)).toEqual(["33.3%", "33.3%", "33.3%"]);
    expect(props.rows).toEqual([["CLIENTE", "—", "a@b.mx"]]);
  });

  test("cotizaciones: alineación, negritas, Total general y fila de totales bajo el importe", () => {
    const columns = [
      col<Quote>("id", "Cotización"),
      col<Quote>("cliente_razon_social", "Razón social", "cliente_razon_social"),
      col<Quote>("piezas", "Piezas", "piezas"),
      col<Quote>("created_at", "Fecha", "created_at"),
      col<Quote>("importe_sin_iva", "Importe sin IVA", "importe_sin_iva"),
    ];
    const quotes = [
      { id: 7, cliente_razon_social: "CLIENTE", piezas: 3, created_at: null, importe_sin_iva: 1000, moneda_codigo: "MXN" },
    ] as unknown as Quote[];
    const props = quotesPdfProps(quotes, columns, NOW);

    expect(props.title).toBe("Reporte de Cotizaciones");
    expect(widths(props)).toEqual(["16.0%", "32.0%", "9.3%", "24.0%", "18.7%"]);
    expect(props.columns.map((c) => c.align ?? "left")).toEqual(["left", "left", "right", "left", "right"]);
    expect(props.columns.map((c) => c.bold ?? false)).toEqual([false, false, false, false, true]);

    const total = formatQuoteExportTotal(quotes);
    expect(props.meta.at(-1)).toEqual({ label: "Total general:", value: total });
    expect(props.totalRow?.valueIndex).toBe(4);
    expect(props.totalRow?.cells).toEqual(["Total", "", "", "", total]);
    expect(props.rows[0][3]).toBe("—");
  });

  test("cotizaciones sin la columna de importe: sin fila de totales", () => {
    const props = quotesPdfProps([], [col<Quote>("id", "Cotización")], NOW);
    expect(props.totalRow).toBeNull();
  });
});
