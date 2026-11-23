import { formatShortDate } from "./formatDate";
import { getMexicoTimeHHMM, getMexicoTodayDate, MEXICO_TIME_ZONE } from "./mexicoTime";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Día y mes en México con las mismas opciones que `formatShortDate`. Se arma
 * con `formatToParts` porque `format` en `es-MX` los une con guion ("13-nov").
 */
const dayMonthFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: MEXICO_TIME_ZONE,
});

/** "13 nov": día y mes abreviado, sin año. */
const formatDayMonth = (timestamp: number): string => {
  const parts = dayMonthFormatter.formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${part("month")}`;
};

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

  return createdKey.slice(0, 4) === nowKey.slice(0, 4)
    ? formatDayMonth(timestamp)
    : formatShortDate(value, { timeZone: MEXICO_TIME_ZONE });
};

/**
 * Fecha y hora completas en México, "13 nov 2026 · 16:20": el estilo de
 * `formatShortDateTime` (que también usa la zona de México), pero con la hora
 * en 24 h, la de "Ayer, HH:mm". Para el `title` del timestamp. `null` si el valor falta o no parsea.
 */
export const formatMexicoDateTime = (value: string | null | undefined): string | null => {
  if (parseTimestamp(value) === null) return null;
  return `${formatShortDate(value, { timeZone: MEXICO_TIME_ZONE })} · ${getMexicoTimeHHMM(value)}`;
};
