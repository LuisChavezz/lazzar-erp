import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Colores por estatus de una recepción, según `ReceiptDetail.estatus_label`
 * (GET /compras/recepciones/{id}/). Solo "Recibida" y "Parcial" están
 * confirmados en producción hasta ahora — cualquier otro valor cae en el
 * fallback neutro de `StatusBadge` (no rompe ni queda sin estilo). Agregar
 * aquí conforme se confirmen nuevos valores reales del backend.
 *
 * Nota: el listado de recepciones (`ReceiptColumns.tsx`) solo trae el código
 * numérico `estatus`, sin el texto legible — no hay forma de mapearlo contra
 * este config sin que el backend exponga esa relación, así que el badge de
 * la tabla se queda con su fallback neutro por ahora.
 */
export const RECEIPT_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  Recibida: {
    label: "Recibida",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Parcial: {
    label: "Parcial",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
};
