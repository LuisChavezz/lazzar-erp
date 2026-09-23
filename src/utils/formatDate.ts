/**
 * Convierte un string "yyyy-mm-dd" en una fecha local, evitando el desfase por
 * UTC que produce `new Date("yyyy-mm-dd")`. También acepta un datetime ISO
 * completo (con "T", p.ej. "2026-07-02T18:22:11.123456Z"), delegando en
 * `Date` nativo ya que ese formato sí codifica su propio offset. Devuelve
 * null si el valor está vacío o no tiene ninguno de los formatos esperados.
 */
export const parseLocalDate = (
  value: string | null | undefined,
): Date | null => {
  if (!value) return null;

  if (value.includes("T")) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

/**
 * Fecha de HOY como "yyyy-mm-dd" en la zona horaria LOCAL.
 *
 * No usa `toISOString()`: ese devuelve el día en UTC, que en México (UTC-6) a
 * partir de las 18:00 locales ya es mañana.
 */
export const getLocalTodayDate = (): string => toLocalDateKey(new Date());

/** Día calendario LOCAL de un `Date` como "yyyy-mm-dd" (sin pasar por UTC). */
export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Medianoche LOCAL de un día "yyyy-mm-dd" como datetime ISO con offset
 * explícito, p. ej. "2026-09-23T00:00:00-06:00".
 *
 * Ni `toISOString()` (convierte a UTC: "2026-09-23T06:00:00Z", que un backend
 * que guarde fecha en otra zona puede leer como otro día) ni la fecha pelada
 * (el campo es datetime). El offset es el que rige ESE día en la zona del
 * navegador, no el de hoy, por si la zona tuviera horario de verano.
 * Devuelve `null` si el valor no es un día válido.
 */
export const toLocalMidnightIso = (dateKey: string): string | null => {
  const date = parseLocalDate(dateKey);
  if (!date || dateKey.includes("T")) return null;
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  return `${toLocalDateKey(date)}T00:00:00${sign}${hours}:${minutes}`;
};

/**
 * Formatea un string "yyyy-mm-dd" como fecha local es-MX. Devuelve "—" cuando
 * no hay valor y el valor original cuando no puede parsearse.
 */
export const formatLocalDate = (value: string | null | undefined): string => {
  const date = parseLocalDate(value);
  if (date) return date.toLocaleDateString("es-MX");
  return value ? value : "—";
};

/**
 * Formatea una fecha (`Date` o string parseable por `Date`, p.ej. un ISO
 * completo) como "14 jul 2026" (es-MX: día 2 dígitos, mes abreviado, año).
 * Devuelve "—" para valores vacíos o que no parseen a una fecha válida.
 *
 * `timeZone: "UTC"` es para fechas-calendario sin componente de hora (p.ej.
 * un `Date` construido a medianoche UTC): fija el día renderizado entre SSR
 * e hidratación. Omítelo para timestamps reales (con hora) donde se quiere
 * el día en la zona horaria del usuario — p.ej. junto con una hora mostrada
 * por separado.
 */
export const formatShortDate = (
  value: string | Date | null | undefined,
  options: { timeZone?: string } = {},
): string => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  });
};

/**
 * Formatea la HORA (hh:mm, es-MX) de un timestamp real con offset propio —
 * pareja de `formatShortDate` para cuando fecha y hora se muestran por
 * separado (p.ej. "14 jul 2026" · "10:32"). Sin `timeZone: "UTC"`: es para
 * timestamps con hora, no para fechas-calendario (ver nota en
 * `formatShortDate`). Devuelve "—" para valores vacíos o que no parseen.
 */
export const formatShortTime = (
  value: string | Date | null | undefined,
): string => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};
