import { formatShortDate, parseLocalDate } from "@/src/utils/formatDate";
import { formatPercentageNumber } from "@/src/utils/percentage";

/**
 * Rango de entrega estimado (`fecha_entrega_min`–`fecha_entrega_max`).
 *
 * Son fechas-calendario `"YYYY-MM-DD"`: pasan por `parseLocalDate` ANTES de
 * `formatShortDate`, que con el string crudo haría `new Date("YYYY-MM-DD")`
 * (medianoche UTC) y en México pintaría el día anterior. Con el `Date` local ya
 * construido, `formatShortDate` solo aplica el formato "14 jul 2026" que usa el
 * resto de la cabecera.
 */
export function formatEntregaEstimada(min: string | null, max: string | null): string {
  const desde = parseLocalDate(min);
  const hasta = parseLocalDate(max);
  if (!desde || !hasta) return "—";
  const desdeLabel = formatShortDate(desde);
  const hastaLabel = formatShortDate(hasta);
  return desdeLabel === hastaLabel ? desdeLabel : `${desdeLabel} – ${hastaLabel}`;
}

/**
 * Fecha-calendario `"YYYY-MM-DD"` (p. ej. `fecha_compromiso`) con el MISMO
 * formato y la misma lectura local que cada extremo de `formatEntregaEstimada`.
 * "—" sin valor.
 */
export function formatFechaCalendario(value: string | null): string {
  const date = parseLocalDate(value);
  return date ? formatShortDate(date) : "—";
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
