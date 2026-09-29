/**
 * Cálculo de días de un periodo de vacaciones. Funciones PURAS: no leen el
 * reloj ni la zona horaria del navegador.
 *
 * Las fechas llegan como `"YYYY-MM-DD"` (DateField) y se recorren en UTC a
 * propósito: un día UTC siempre dura 24 h, así que sumar `DAY_MS` nunca se
 * salta ni repite un día por un cambio de horario local.
 */

import { getDiaLaboralCode } from "@/src/features/shifts/constants/diasLaborales";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Medianoche UTC (ms) de un `"YYYY-MM-DD"` válido, o `null`. */
const toUtcDay = (value: string): number | null => {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  // Rechaza fechas que `Date.UTC` "normaliza" (p. ej. 2026-02-30 → 2 mar).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
};

/**
 * Días CALENDARIO del rango, ambos extremos incluidos. `null` si falta una
 * fecha, alguna es inválida o `fin` es anterior a `inicio`.
 */
export const countCalendarDays = (inicio: string, fin: string): number | null => {
  const start = toUtcDay(inicio);
  const end = toUtcDay(fin);
  if (start === null || end === null || end < start) {
    return null;
  }
  return Math.round((end - start) / DAY_MS) + 1;
};

/**
 * Días LABORALES del rango según los días del turno (códigos ya parseados con
 * `parseDiasLaborales`), ambos extremos incluidos. Los festivos NO se
 * descuentan. Mismo `null` que `countCalendarDays`.
 */
export const countWorkingDays = (
  inicio: string,
  fin: string,
  diasLaborales: readonly string[]
): number | null => {
  const total = countCalendarDays(inicio, fin);
  const start = toUtcDay(inicio);
  if (total === null || start === null) {
    return null;
  }

  const laborales = new Set(diasLaborales);
  let count = 0;
  for (let offset = 0; offset < total; offset += 1) {
    if (laborales.has(getDiaLaboralCode(new Date(start + offset * DAY_MS)))) {
      count += 1;
    }
  }
  return count;
};
