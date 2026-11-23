import { formatShortDate } from "./formatDate";
import { getMexicoTimeHHMM, getMexicoTodayDate, MEXICO_TIME_ZONE } from "./mexicoTime";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Año final de `formatShortDate` ("13 nov 2026" → "13 nov"). Se recorta en vez
 * de pedir a `Intl` solo día y mes porque `es-MX` los une con guion ("13-nov").
 */
const YEAR_SUFFIX = /\s+\d{4}$/;

/** Instante en ms, o `null` si el valor falta o no parsea. */
const parseTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

/** Días-calendario entre dos claves "YYYY-MM-DD" (sin depender de la zona local). */
const calendarDaysBetween = (fromKey: string, toKey: string): number => {
  const toUtc = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / DAY);
};

/**
 * Etiqueta híbrida de un timestamp real (EC-930):
 * - menos de un minuto, o en el futuro (desfase de reloj): "Hace un momento";
 * - menos de una hora: "Hace 5 min";
 * - mismo día: "Hace 1 hora" / "Hace 2 horas";
 * - día anterior: "Ayer, 16:20" (24 h);
 * - de 2 a 6 días-calendario: "Hace 3 días";
 * - 7 o más: "13 nov", con el año solo si no es el actual ("13 nov 2025").
 *
 * Los días-calendario, el año en curso y la hora se calculan en
 * `MEXICO_TIME_ZONE`, no en la zona del navegador. `null` si el valor falta o
 * no parsea.
 *
 * `nowMs` se INYECTA a propósito: el React Compiler prohíbe `Date.now()`
 * durante el render, así que "ahora" lo aporta quien llama (p. ej.
 * `useMinuteNow`).
 */
export const formatRelativeTime = (
  value: string | null | undefined,
  nowMs: number,
): string | null => {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) return null;

  const elapsed = nowMs - timestamp;
  if (elapsed < MINUTE) return "Hace un momento";

  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `Hace ${minutes} min`;
  }

  const createdKey = getMexicoTodayDate(new Date(timestamp));
  const nowKey = getMexicoTodayDate(new Date(nowMs));
  const days = calendarDaysBetween(createdKey, nowKey);

  if (days <= 0) {
    const hours = Math.floor(elapsed / HOUR);
    return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  if (days === 1) return `Ayer, ${getMexicoTimeHHMM(value)}`;

  if (days < 7) return `Hace ${days} días`;

  const fullDate = formatShortDate(value, { timeZone: MEXICO_TIME_ZONE });
  return createdKey.slice(0, 4) === nowKey.slice(0, 4)
    ? fullDate.replace(YEAR_SUFFIX, "")
    : fullDate;
};

/**
 * Fecha y hora completas en México, "13 nov 2026 · 16:20": el mismo estilo que
 * `formatShortDateTime`, que en cambio usa la zona del navegador. Para el
 * `title` del timestamp. `null` si el valor falta o no parsea.
 */
export const formatMexicoDateTime = (value: string | null | undefined): string | null => {
  if (parseTimestamp(value) === null) return null;
  return `${formatShortDate(value, { timeZone: MEXICO_TIME_ZONE })} · ${getMexicoTimeHHMM(value)}`;
};
