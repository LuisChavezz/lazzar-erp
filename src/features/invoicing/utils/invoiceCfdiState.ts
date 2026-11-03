import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Estado del CFDI de una factura, UNO solo por factura, para la columna «CFDI»
 * del listado y su filtro. No es un estatus de la factura: los flags del CFDI
 * son independientes de `estatus` (timbrar no lo cambia y una `Cancelada`
 * puede conservar su CFDI vigente).
 */
export type InvoiceCfdiState =
  | "timbrado_pendiente"
  | "sin_timbrar"
  | "cancelado_sat"
  | "cancelacion_solicitada"
  | "timbrada";

/**
 * Estado del CFDI a partir de los flags del listado o del retrieve, con esta
 * precedencia (vale para cualquier `estatus`):
 *
 * 1. Sin UUID y con `cfdi_pendiente` → timbrado sin confirmar.
 * 2. Sin UUID → sin timbrar.
 * 3. Con UUID y `cfdi_cancelado` → cancelado ante el SAT.
 * 4. Con UUID y `cfdi_cancelacion_solicitada` → cancelación solicitada,
 *    pendiente de que el receptor la acepte.
 * 5. Con UUID → timbrada.
 *
 * El backend nunca deja `cfdi_cancelado` y `cfdi_cancelacion_solicitada` en
 * `true` a la vez (un `canceled` apaga la solicitud); la precedencia lo cubre
 * de todos modos.
 */
export const getInvoiceCfdiState = (invoice: {
  cfdi_uuid?: string | null;
  cfdi_pendiente?: boolean;
  cfdi_cancelado?: boolean;
  cfdi_cancelacion_solicitada?: boolean;
}): InvoiceCfdiState => {
  if (!invoice.cfdi_uuid) {
    return invoice.cfdi_pendiente === true ? "timbrado_pendiente" : "sin_timbrar";
  }
  if (invoice.cfdi_cancelado === true) return "cancelado_sat";
  if (invoice.cfdi_cancelacion_solicitada === true) return "cancelacion_solicitada";
  return "timbrada";
};

/** Rótulo y colores de cada estado: la celda, la búsqueda y el filtro usan el mismo texto. */
export const INVOICE_CFDI_STATE_CONFIG: Record<InvoiceCfdiState, StatusBadgeConfigEntry> = {
  timbrada: {
    label: "Timbrada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  sin_timbrar: {
    label: "Sin timbrar",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  timbrado_pendiente: {
    label: "Timbrado pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  cancelacion_solicitada: {
    label: "Cancelación solicitada",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  cancelado_sat: {
    label: "Cancelado ante el SAT",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

/** Rótulo del estado del CFDI de una factura. */
export const getInvoiceCfdiStateLabel = (
  invoice: Parameters<typeof getInvoiceCfdiState>[0],
): string => INVOICE_CFDI_STATE_CONFIG[getInvoiceCfdiState(invoice)].label ?? "";
