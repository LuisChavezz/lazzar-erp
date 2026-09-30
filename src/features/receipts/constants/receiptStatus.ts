import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * `Recepcion.EstatusRecepcion` (nucleo-erp, compras/models.py): código numérico
 * → etiqueta, tal como la devuelve `estatus_label` en el detalle
 * (GET /compras/recepciones/{id}/). El listado solo trae el código, así que
 * pasa por este mapa para llegar al mismo badge.
 *
 * Desde el filtro de Calidad, una recepción nueva nace en `4 En calidad` y la
 * inspección la deja en `5 Cerrada`; `2 Recibida` y `3 Parcial` ya no se
 * asignan, pero siguen en las recepciones anteriores a ese cambio.
 */
export const RECEIPT_ESTATUS_LABELS: Record<number, string> = {
  1: "Borrador",
  2: "Recibida",
  3: "Parcial",
  4: "En calidad",
  5: "Cerrada",
  6: "Cancelada",
};

/**
 * Etiqueta de un código de estatus del LISTADO (que solo trae el número). Un
 * código fuera del enum conocido se muestra como "Estatus N" en vez de ocultarse.
 */
export const getReceiptEstatusLabel = (estatus: number): string =>
  RECEIPT_ESTATUS_LABELS[estatus] ?? `Estatus ${estatus}`;

/**
 * Colores por estatus de una recepción, indexados por `estatus_label`. Un valor
 * que no esté aquí cae en el fallback neutro de `StatusBadge`.
 */
export const RECEIPT_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  Borrador: {
    label: "Borrador",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
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
  "En calidad": {
    label: "En calidad",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Cerrada: {
    label: "Cerrada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelada: {
    label: "Cancelada",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
