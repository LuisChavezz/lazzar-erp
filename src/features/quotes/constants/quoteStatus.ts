import type { DialogHeaderStatusColor } from "@/src/constants/dialogStatusColors";
import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { capitalize } from "@/src/utils/capitalize";
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
 *
 * Queda tipada `Record<number, …>` (no `Partial`) porque `optionsFromConfig`
 * exige un `Record` completo. Por eso, para RENDERIZAR un estatus que llega del
 * backend, NO se indexa directo: se usa `getQuoteStatusConfig`, que obliga a
 * manejar el caso ausente. El `Record` es solo para recorrerlo (filtros).
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
      cls: column.statusBadgeClass,
      dot: column.accentDot,
      dialogColor: column.dialogColor,
    },
  ]),
);

/** Estilo neutro para un estatus ausente o que el front no conoce. */
export const QUOTE_STATUS_FALLBACK_CLS =
  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";

/** Punto del estatus neutro: el mismo gris que Borrador y que `StatusBadge`. */
export const QUOTE_STATUS_FALLBACK_DOT = "bg-slate-400";

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

/**
 * Color del encabezado de diálogo de una cotización; "slate" (el mismo neutro
 * que el badge, `QUOTE_STATUS_FALLBACK_CLS`) si el estatus no se conoce.
 */
export const getQuoteDialogStatusColor = (
  estatus: number | null | undefined,
): DialogHeaderStatusColor => getQuoteStatusConfig(estatus)?.dialogColor ?? "slate";

/**
 * Nombre visible del estatus de una cotización: el de la config para los
 * estatus conocidos; para uno que el front no conoce, el `estatus_label` del
 * backend (que llega en mayúsculas, "EN REVISION") con el casing de la app y,
 * si tampoco viene, `Estatus N`. Es el MISMO texto en el badge, la búsqueda
 * global y la opción del filtro de encabezado.
 */
export const getQuoteStatusLabel = (quote: {
  estatus: number | null | undefined;
  estatus_label?: string | null;
}): string => {
  const known = getQuoteStatusConfig(quote.estatus)?.label;
  if (known) return known;
  const backendLabel = quote.estatus_label?.trim();
  if (backendLabel) return capitalize(backendLabel);
  return quote.estatus == null ? "Sin estatus" : `Estatus ${quote.estatus}`;
};
