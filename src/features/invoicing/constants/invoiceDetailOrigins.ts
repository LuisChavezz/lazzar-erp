import {
  ORDER_DETAIL_SHEET_PARAM,
  type OrderDetailSheet,
} from "@/src/features/orders/constants/orderDetailSheets";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import {
  DEFAULT_INVOICE_DETAIL_SHEET,
  INVOICE_DETAIL_SHEET_PARAM,
  type InvoiceDetailSheet,
} from "./invoiceDetailSheets";

/**
 * Orígenes válidos del detalle de factura (`/finance/invoicing/[id]?from=…`),
 * mismo patrón de lista cerrada que `purchaseOrderDetailOrigins`:
 *
 * - `invoicing`: el listado de facturas.
 * - `order`: "Documentos relacionados" del detalle de pedido. Lleva además
 *   `pedido=<id>` para volver a ESE pedido.
 *
 * La búsqueda global enlaza SIN `from` (precedente de las órdenes de
 * producción): se abre desde cualquier ruta, no hay un listado al que volver, y
 * quien recibe la fila puede abrir el listado de facturas (mismo permiso).
 * Sin `from` o con uno desconocido se vuelve al listado de facturas. Nunca se
 * navega a una URL tomada de la query: solo a destinos fijos o armados con
 * primitivos validados.
 */
export const INVOICE_DETAIL_ORIGINS = ["invoicing", "order"] as const;

export type InvoiceDetailOrigin = (typeof INVOICE_DETAIL_ORIGINS)[number];

export function isInvoiceDetailOrigin(value: string | undefined): value is InvoiceDetailOrigin {
  return value !== undefined && (INVOICE_DETAIL_ORIGINS as readonly string[]).includes(value);
}

/**
 * Parámetros de la URL del detalle que se conservan al cambiar de hoja o de
 * parcialidad, tal como llegan (CRUDOS: se validan al resolver el "Volver").
 */
export interface InvoiceDetailQuery {
  from?: string;
  pedido?: string;
  sheet?: string;
}

/** Ruta base del detalle (sin query): la que evalúa el proxy. */
export const invoiceDetailPath = (id: number) => `/finance/invoicing/${id}`;

/**
 * URL del detalle de una factura. `from` tipado: un origen mal escrito no
 * compila. El origen `order` EXIGE el pedido al que vuelve.
 */
export function invoiceDetailHref(id: number, from?: Exclude<InvoiceDetailOrigin, "order">): string;
export function invoiceDetailHref(id: number, from: "order", context: { pedido: number }): string;
export function invoiceDetailHref(
  id: number,
  from?: InvoiceDetailOrigin,
  context?: { pedido: number },
): string {
  const base = invoiceDetailPath(id);
  if (!from) return base;
  const query = new URLSearchParams({ from });
  if (from === "order" && context) query.set("pedido", String(context.pedido));
  return `${base}?${query.toString()}`;
}

/**
 * URL de `sheet` en la factura `id` (la misma u otra parcialidad del pedido)
 * conservando el origen, para que su "Volver" siga llevando a donde empezó.
 * La hoja por defecto no se escribe.
 */
export function buildInvoiceDetailHref(
  id: number,
  query: InvoiceDetailQuery,
  sheet: InvoiceDetailSheet,
): string {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.pedido) params.set("pedido", query.pedido);
  if (sheet !== DEFAULT_INVOICE_DETAIL_SHEET) params.set(INVOICE_DETAIL_SHEET_PARAM, sheet);
  const search = params.toString();
  return search ? `${invoiceDetailPath(id)}?${search}` : invoiceDetailPath(id);
}

// ── "Volver" ─────────────────────────────────────────────────────────────────

export interface InvoiceBackTarget {
  href: string;
  label: string;
}

const DEFAULT_BACK: InvoiceBackTarget = {
  href: "/finance/invoicing",
  label: "Volver a Facturación",
};

/** Hoja "Avances" del pedido: ahí está la tabla de documentos de la que se vino. */
const ORDER_PROGRESS_SHEET: OrderDetailSheet = "progress";

/**
 * Resuelve el "Volver" desde el `?from=` crudo. `canOpen` dice si el usuario
 * puede abrir una ruta (la regla del proxy): el detalle de pedido exige otros
 * permisos que facturación, y un enlace compartido no debe llevar a una ruta
 * que rebota al Home; en ese caso se vuelve al listado de facturas.
 */
export function resolveInvoiceBack(
  query: InvoiceDetailQuery,
  canOpen: (pathname: string) => boolean,
): InvoiceBackTarget {
  if (!isInvoiceDetailOrigin(query.from)) return DEFAULT_BACK;
  if (query.from === "order") {
    const pedido = parsePositiveId(query.pedido);
    const path = pedido === null ? null : `/orders/${pedido}`;
    if (!path || !canOpen(path)) return DEFAULT_BACK;
    return {
      href: `${path}?${ORDER_DETAIL_SHEET_PARAM}=${ORDER_PROGRESS_SHEET}`,
      label: "Volver al Pedido",
    };
  }
  return DEFAULT_BACK;
}
