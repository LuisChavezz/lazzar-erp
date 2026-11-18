/**
 * Rango que pinta el calendario (`datesSet` de FullCalendar): `start` incluido,
 * `end` EXCLUIDO, ambos a medianoche local. Se guarda como ISO para que dos
 * rangos iguales se comparen por valor (no vuelven a renderizar ni a pedir).
 */
export interface CalendarVisibleRange {
  timeMin: string;
  timeMax: string;
}

/** Rango visible → parámetros `timeMin`/`timeMax` del backend (ISO 8601, UTC). */
export const toCalendarRange = (start: Date, end: Date): CalendarVisibleRange => ({
  timeMin: start.toISOString(),
  timeMax: end.toISOString(),
});

export const isSameCalendarRange = (a: CalendarVisibleRange, b: CalendarVisibleRange) =>
  a.timeMin === b.timeMin && a.timeMax === b.timeMax;

/**
 * Rango que pinta la vista de MES de FullCalendar para la fecha dada, con la
 * configuración de `GoogleCalendar` (`firstDay={0}`, `fixedWeekCount={false}`):
 * del domingo de la semana del día 1 al domingo siguiente a la semana del
 * último día. Es solo el rango INICIAL, para pedir los eventos antes de que el
 * calendario se monte; en cuanto FullCalendar reporta su rango (`datesSet`),
 * manda ese.
 */
export const monthGridRange = (date: Date): CalendarVisibleRange => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + (7 - last.getDay()));
  return toCalendarRange(start, end);
};

/** Llave de la consulta de eventos de un rango (prefijo común para invalidar). */
export const GOOGLE_CALENDAR_EVENTS_KEY = ["google", "calendar", "events"] as const;

export const googleCalendarEventsQueryKey = (params: Record<string, string>) =>
  [...GOOGLE_CALENDAR_EVENTS_KEY, params] as const;

/** Parámetros de la petición de un rango (por página: `maxResults`). */
export const toCalendarEventsParams = (
  range: CalendarVisibleRange,
  maxResults: number,
): Record<string, string> => ({
  timeMin: range.timeMin,
  timeMax: range.timeMax,
  maxResults: String(maxResults),
});
