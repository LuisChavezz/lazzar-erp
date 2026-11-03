import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Estado del CFDI de egreso de una nota de crédito, para la columna «CFDI» del
 * listado y su filtro. La nota solo trae `cfdi_uuid` y `cfdi_pendiente`: el ERP
 * no cancela su CFDI ante el SAT, así que no hay estados de cancelación.
 */
export type CreditNoteCfdiState = "timbrado_pendiente" | "sin_timbrar" | "timbrada";

/**
 * Precedencia: sin UUID y con `cfdi_pendiente` → timbrado sin confirmar; sin
 * UUID → sin timbrar; con UUID → timbrada. Vale para cualquier `estatus`.
 */
export const getCreditNoteCfdiState = (nota: {
  cfdi_uuid?: string | null;
  cfdi_pendiente?: boolean;
}): CreditNoteCfdiState => {
  if (nota.cfdi_uuid) return "timbrada";
  return nota.cfdi_pendiente === true ? "timbrado_pendiente" : "sin_timbrar";
};

/** Rótulo y colores de cada estado: los mismos que la columna «CFDI» de facturas. */
export const CREDIT_NOTE_CFDI_STATE_CONFIG: Record<CreditNoteCfdiState, StatusBadgeConfigEntry> = {
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
};

/** Rótulo del estado del CFDI de una nota. */
export const getCreditNoteCfdiStateLabel = (
  nota: Parameters<typeof getCreditNoteCfdiState>[0],
): string => CREDIT_NOTE_CFDI_STATE_CONFIG[getCreditNoteCfdiState(nota)].label ?? "";
