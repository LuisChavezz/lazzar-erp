import { getLocalTodayDate } from "./formatDate";

/**
 * Nombre de archivo de una exportación con el día LOCAL del navegador:
 * `datedFileName("clientes", "csv")` → "clientes-2026-11-10.csv".
 *
 * Un solo lugar para todas las exportaciones de listados (CSV y PDF), que
 * antes copiaban `toISOString().split("T")[0]` (día UTC: en México a partir de
 * las 18:00 ya es mañana). Un PDF pasa el MISMO `now` con el que fecha su
 * encabezado, para que nombre y encabezado no difieran si el render cruza la
 * medianoche.
 */
export const datedFileName = (
  prefix: string,
  extension: string,
  now: Date = new Date(),
): string => `${prefix}-${getLocalTodayDate(now)}.${extension}`;
