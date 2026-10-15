import { parsePositiveId } from "@/src/utils/parsePositiveId";

/**
 * Proveedor preseleccionado del listado de facturas de proveedor, leído de
 * `?proveedor=` (lo pone el "Volver" del detalle de OC). Entero positivo o
 * `null` — un valor inválido se trata como ausente.
 */
export const parseSupplierInvoicesProveedor = (
  value: string | string[] | null | undefined,
): number | null => parsePositiveId(value);

/** URL del listado de facturas de proveedor, con el proveedor ya elegido si lo hay. */
export const supplierInvoicesHref = (proveedorId: number | null): string =>
  proveedorId !== null
    ? `/finance/supplier-invoices?proveedor=${proveedorId}`
    : "/finance/supplier-invoices";
