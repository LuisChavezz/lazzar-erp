import { formatShortCalendarDate } from "@/src/utils/formatDate";

/**
 * "Última Compra" de un cliente (`fecha_ultima_compra`), la misma columna en el
 * listado de Ventas y en el de Mesa de Control: el backend la calcula con UNA
 * sola anotación para los dos endpoints (EC-853), así que se rotula y se
 * formatea en un solo lugar para que no se separen.
 */

/** Texto de un cliente sin compras: celdas, exportaciones y filtro por mes. */
export const SIN_COMPRAS_LABEL = "Sin compras";

/**
 * El día de `fecha_ultima_compra` ("14 jul 2026") leído como fecha-calendario
 * (sin pasar por medianoche UTC, EC-558); `SIN_COMPRAS_LABEL` si es `null` (el
 * cliente nunca ha comprado) y "—" si el campo no viene o no es una fecha
 * válida.
 */
export const formatUltimaCompra = (value: string | null | undefined): string =>
  value === null ? SIN_COMPRAS_LABEL : formatShortCalendarDate(value);
