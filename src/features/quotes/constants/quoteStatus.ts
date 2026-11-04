import type { DialogHeaderStatusColor } from "@/src/components/DialogHeader";
import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { KANBAN_COLUMNS } from "./kanbanColumns";

/**
 * Presentación por estatus de la cotización, indexada por el entero crudo del
 * backend (`Cotizacion.CHOICES_ESTATUS`: 1 Borrador, 2 En revisión — "Por
 * Autorizar" en la app —, 3 Autorizada, 4 Rechazada, 5 Cambios solicitados;
 * enum completo).
 *
 * Se DERIVA de `KANBAN_COLUMNS`, que es la fuente única de colores: aquí no se
 * declara ninguna clase. Tiene la forma de `StatusBadgeConfigEntry` (`label`,
 * `cls`, `dot`) para que la consuman tanto `optionsFromConfig` (filtros) como
 * `StatusBadge` (celda de estatus), igual que las configs de Finanzas, más el
 * color del encabezado de diálogo (`dialogColor`).
 */
export interface QuoteStatusConfigEntry extends StatusBadgeConfigEntry {
  label: string;
  dialogColor: DialogHeaderStatusColor;
}

export const QUOTE_STATUS_CONFIG: Record<number, QuoteStatusConfigEntry> = Object.fromEntries(
  KANBAN_COLUMNS.map((column) => [
    column.estatus,
    {
      label: column.label,
      cls: column.badgeClass,
      dot: column.accentDot,
      dialogColor: column.dialogColor,
    },
  ]),
);

/** Estilo neutro para un estatus ausente o que el front no conoce. */
export const QUOTE_STATUS_FALLBACK_CLS =
  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";

/**
 * Entrada de un estatus que llega del backend, o `undefined` si no la hay.
 * `Object.hasOwn` (no indexado directo) para que un valor como `constructor`
 * no resuelva a algo heredado de `Object.prototype`.
 */
export const getQuoteStatusConfig = (
  estatus: number | null | undefined,
): QuoteStatusConfigEntry | undefined =>
  estatus != null && Object.hasOwn(QUOTE_STATUS_CONFIG, estatus)
    ? QUOTE_STATUS_CONFIG[estatus]
    : undefined;

/** Color del encabezado de diálogo de una cotización; "sky" si el estatus no se conoce. */
export const getQuoteDialogStatusColor = (
  estatus: number | null | undefined,
): DialogHeaderStatusColor => getQuoteStatusConfig(estatus)?.dialogColor ?? "sky";
