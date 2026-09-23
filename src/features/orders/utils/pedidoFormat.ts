import { formatShortDate, parseLocalDate } from "@/src/utils/formatDate";

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
 * Varios pedidos traen "-" como OC (placeholder del backend, no una OC real):
 * solo se muestra el badge de OC cuando queda algo tras quitar guiones.
 */
export function hasMeaningfulOc(oc: string | null): oc is string {
  return Boolean(oc && oc.replace(/-/g, "").trim().length > 0);
}
