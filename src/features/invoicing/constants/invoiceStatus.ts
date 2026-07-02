import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Estatus posibles de una factura, tal como los devuelve el backend
 * (`estatus` en {@link import("../interfaces/invoice.interface").Invoice}).
 * Fuente única: tanto la columna de estatus (`InvoiceColumns`) como los KPIs
 * (`InvoiceStats`) comparan contra estas constantes en vez de re-declarar los
 * literales — si el backend renombra un estatus, ambos dejan de reconocerlo
 * de forma visible (badge gris) en lugar de que los KPIs lo cuenten mal en
 * silencio.
 */
export const INVOICE_STATUS = {
  EMITIDA: "Emitida",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
} as const;

export const INVOICE_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  [INVOICE_STATUS.EMITIDA]: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [INVOICE_STATUS.PAGADA]: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [INVOICE_STATUS.VENCIDA]: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  [INVOICE_STATUS.CANCELADA]: {
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};
