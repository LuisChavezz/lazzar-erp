import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { ReceiptTipoOrigen } from "../interfaces/receipt.interface";

/**
 * Badge y etiqueta del origen de una recepción. "SM" (EC-912) es el regreso de
 * una salida a maquila de OB/OR; la de una SM de OP se registra como "OP".
 */
export const RECEIPT_TIPO_ORIGEN_CFG: Record<ReceiptTipoOrigen, StatusBadgeConfigEntry> = {
  OC: {
    label: "Orden de Compra",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  OP: {
    label: "Orden de Producción",
    cls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  SM: {
    label: "Salida a Maquila",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

export const RECEIPT_TIPO_ORIGEN_DESCONOCIDO_CFG: StatusBadgeConfigEntry = {
  label: "Desconocido",
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
};

/** Etiqueta del origen; "Desconocido" para un valor que el front no conoce. */
export const receiptTipoOrigenLabel = (tipoOrigen: string): string =>
  (RECEIPT_TIPO_ORIGEN_CFG as Record<string, StatusBadgeConfigEntry | undefined>)[tipoOrigen]?.label ??
  "Desconocido";
