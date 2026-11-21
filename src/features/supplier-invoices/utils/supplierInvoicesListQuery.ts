import { parsePositiveId } from "@/src/utils/parsePositiveId";

/**
 * Proveedor preseleccionado del listado de facturas de proveedor, leído de
 * `?proveedor=` (lo pone el "Volver" del detalle de OC). Entero positivo o
 * `null` — un valor inválido se trata como ausente.
 */
export const parseSupplierInvoicesProveedor = (
  value: string | string[] | null | undefined,
): number | null => parsePositiveId(value);

/**
 * SM cuyas facturas de maquila se listan, de `?salida_maquila=` (filtro de
 * servidor del mismo nombre, nucleo-erp #1233; lo pone el detalle de la SM,
 * EC-919). Misma validación que el proveedor.
 */
export const parseSupplierInvoicesSalidaMaquila = parseSupplierInvoicesProveedor;

/** Factura cuyo detalle se abre al entrar, de `?factura=` (el detalle de la SM la enlaza). */
export const parseSupplierInvoicesFactura = parseSupplierInvoicesProveedor;

/**
 * URL del listado de facturas de proveedor con sus filtros de servidor: el
 * proveedor y, opcionalmente, la SM (`salida_maquila`) y la factura a abrir.
 */
export const supplierInvoicesHref = (
  proveedorId: number | null,
  { salidaMaquilaId = null, facturaId = null }: { salidaMaquilaId?: number | null; facturaId?: number | null } = {},
): string => {
  const params = new URLSearchParams();
  if (proveedorId !== null) params.set("proveedor", String(proveedorId));
  if (salidaMaquilaId !== null) params.set("salida_maquila", String(salidaMaquilaId));
  if (facturaId !== null) params.set("factura", String(facturaId));
  const query = params.toString();
  return query ? `/finance/supplier-invoices?${query}` : "/finance/supplier-invoices";
};
