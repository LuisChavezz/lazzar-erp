import {
  formatShortCalendarDate,
  formatShortDate,
  LOCAL_TIME_ZONE,
  parseLocalDate,
} from "@/src/utils/formatDate";
import { formatPercentageNumber } from "@/src/utils/percentage";

/**
 * Folio corto para listados: sin guiones ni año ("P-00124-2026" → "P00124").
 * Solo PRESENTACIÓN: el folio completo sigue en el `title`, en la búsqueda y
 * en el resto de pantallas. Un folio con otro formato se muestra tal cual.
 */
export function formatFolioCorto(folio: string | null | undefined): string {
  const value = folio?.trim() ?? "";
  const match = value.match(/^([A-Z]+)-(\d+)-\d{4}$/i);
  return match ? `${match[1]}${match[2]}` : value;
}

/**
 * Rango de entrega estimado (`fecha_entrega_min`–`fecha_entrega_max`).
 *
 * Son fechas-calendario `"YYYY-MM-DD"`: van por `formatShortCalendarDate`, que
 * da el mismo día en cualquier zona del navegador (con `formatShortDate` y el
 * string crudo sería medianoche UTC, en México el día anterior), con el formato
 * "14 jul 2026" que usa el resto de la cabecera. "—" si falta un extremo.
 */
export function formatEntregaEstimada(min: string | null, max: string | null): string {
  const desdeLabel = formatShortCalendarDate(min);
  const hastaLabel = formatShortCalendarDate(max);
  if (desdeLabel === "—" || hastaLabel === "—") return "—";
  return desdeLabel === hastaLabel ? desdeLabel : `${desdeLabel} – ${hastaLabel}`;
}

/**
 * Fecha-calendario `"YYYY-MM-DD"` (p. ej. `fecha_compromiso`) con el MISMO
 * formato y la misma lectura que cada extremo de `formatEntregaEstimada`.
 * "—" sin valor.
 */
export function formatFechaCalendario(value: string | null): string {
  return formatShortCalendarDate(value);
}

/**
 * `fecha_confirmacion` del pedido como "14 jul 2026", en la zona LOCAL del
 * navegador y no en la de México: se ESCRIBE como la medianoche del navegador
 * (`toLocalMidnightIso` en `PedidoFechaConfirmacionField`), así que solo en
 * esa zona sale el día que se capturó, el mismo que muestra el
 * `<input type="date">` del editor. Lectura única de la hoja del pedido, el
 * pedido especial, el PDF y la exportación de surtido; cambia junto con la
 * escritura (EC-936). "—" sin valor o si no parsea.
 */
export function formatFechaConfirmacion(value: string | null | undefined): string {
  return formatShortDate(parseLocalDate(value), { timeZone: LOCAL_TIME_ZONE });
}

/**
 * Plazo que queda hasta la fecha compromiso, a partir de `dias_restantes` del
 * backend (`compromiso - hoy`, NEGATIVO cuando ya venció). `null` sin dato.
 */
export function formatDiasRestantes(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias === 0) return "vence hoy";
  const abs = Math.abs(dias);
  const unidad = abs === 1 ? "día" : "días";
  return dias > 0
    ? `${abs === 1 ? "falta" : "faltan"} ${abs} ${unidad}`
    : `vencido hace ${abs} ${unidad}`;
}

/**
 * Porcentaje de avance del pedido con 1 decimal como máximo (es-MX, sin "%").
 * Es la resolución con que la trazabilidad entrega sus `pct`, y la que usa la
 * barra "Avance asignado" para que su cifra y la del paso "Asignado" se lean
 * igual.
 */
export const formatPedidoPct = (value: number): string => formatPercentageNumber(value);

/**
 * Varios pedidos traen "-" como OC (placeholder del backend, no una OC real):
 * solo se muestra el badge de OC cuando queda algo tras quitar guiones.
 */
export function hasMeaningfulOc(oc: string | null): oc is string {
  return Boolean(oc && oc.replace(/-/g, "").trim().length > 0);
}
