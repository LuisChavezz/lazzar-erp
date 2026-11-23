import { MEXICO_TIME_ZONE } from "./mexicoTime";

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
 * Fecha de HOY como "yyyy-mm-dd" en la zona horaria LOCAL del navegador (no
 * en la de México: para el día del backend usa `getMexicoTodayDate`).
 *
 * No usa `toISOString()`: ese devuelve el día en UTC, que en México (UTC-6) a
 * partir de las 18:00 locales ya es mañana. `now` (por omisión, el momento
 * actual) permite fijar el instante, p. ej. para derivar de UNO solo la fecha
 * de un documento y la de su nombre de archivo, o en pruebas.
 */
export const getLocalTodayDate = (now: Date = new Date()): string => toLocalDateKey(now);

/** Día calendario LOCAL de un `Date` como "yyyy-mm-dd" (sin pasar por UTC). */
export const toLocalDateKey = (date: Date): string => {
  // Año a 4 dígitos: un año < 1000 (p. ej. el "0202" intermedio al teclear en
  // un `<input type="date">`) debe salir con la misma forma "yyyy-mm-dd".
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * ¿Es `value` un día calendario REAL en formato "yyyy-mm-dd"?
 *
 * `parseLocalDate` no sirve como validador: `new Date(2026, 1, 30)` desborda al
 * 2 de marzo en vez de fallar. Aquí se exige la forma exacta y que el día
 * sobreviva al viaje de ida y vuelta (`"2026-02-30"` vuelve como `"2026-03-02"`
 * y se rechaza). Pensado para fechas que viajan a la API como filtro: el
 * backend responde 500 ante una fecha bien formada pero imposible.
 */
export const isValidDateKey = (value: string | null | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseLocalDate(value);
  return date !== null && toLocalDateKey(date) === value;
};

/**
 * ¿Es `value` una fecha COMPLETA capturada en un `<input type="date">`? Día
 * real y año ≥ 1900. El piso descarta los años intermedios que el control
 * emite mientras se teclea el año ("0002", "0020", "0202"…): son días válidos
 * pero no lo que el usuario está escribiendo.
 */
export const isCompleteDateEntry = (value: string | null | undefined): value is string =>
  isValidDateKey(value) && value >= "1900-01-01";

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
 * Rango de dos fechas "yyyy-mm-dd" como "1/10/2026 – 5/10/2026" (es-MX, fecha
 * local). Mismo texto en la celda y en la búsqueda de las tablas de RH.
 */
export const formatLocalDateRange = (range: { fecha_inicio: string; fecha_fin: string }): string =>
  `${formatLocalDate(range.fecha_inicio)} – ${formatLocalDate(range.fecha_fin)}`;

/**
 * Formatea una fecha (`Date` o string parseable por `Date`, p.ej. un ISO
 * completo) como "14 jul 2026" (es-MX: día 2 dígitos, mes abreviado, año).
 * Devuelve "—" para valores vacíos o que no parseen a una fecha válida.
 *
 * Sin `timeZone`, el día sale en `MEXICO_TIME_ZONE` (la del backend, la de las
 * notificaciones y la de `formatShortTime`), no en la del navegador (EC-931):
 * es lo que se quiere para un timestamp real (con hora y offset).
 *
 * - `timeZone: "UTC"` es para fechas-calendario sin componente de hora (p.ej.
 *   un `Date` construido a medianoche UTC): fija el día en cualquier zona.
 * - Para un string "YYYY-MM-DD" (`DateField`) usa `formatShortCalendarDate`:
 *   `new Date` lo lee como medianoche UTC, que en México es el día anterior.
 * - Un `Date` armado a medianoche LOCAL (`parseLocalDate`, `new Date(y, m, d)`)
 *   tampoco va aquí sin zona: en México, al este de la zona del navegador, cae
 *   en el día anterior. Usa `formatShortCalendarDate` con su "YYYY-MM-DD".
 * - `timeZone: getBrowserTimeZone()` mantiene a propósito la zona del
 *   navegador, para un valor que se escribió en esa zona (ver
 *   `fecha_confirmacion` del pedido).
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
    timeZone: options.timeZone ?? MEXICO_TIME_ZONE,
  });
};

/**
 * Zona IANA del navegador (la del proceso en el servidor). Para pasarla como
 * `timeZone` a `formatShortDate` cuando un valor debe seguir mostrándose en la
 * zona LOCAL, que ya no es la de omisión.
 */
export const getBrowserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Fecha-calendario como "14 jul 2026" (mismo formato que `formatShortDate`)
 * sin correr el día EN NINGUNA ZONA: un "YYYY-MM-DD" se arma como la
 * medianoche UTC de ese día y se formatea en UTC, así que sale el mismo día
 * con el navegador en México, en Tokio o en Los Ángeles (EC-931). No pasa por
 * una medianoche local: formateada en otra zona que la del navegador (la de
 * México de `formatShortDate`), al este de México caería en el día anterior.
 *
 * Un datetime con hora (con "T") se delega en `formatShortDate`, que muestra
 * su día en la zona de esta: sirve a los listados que mezclan fechas y
 * datetimes en la misma columna (las filas de documentos del pedido). Para un
 * valor que SIEMPRE es datetime, usa `formatShortDate` directamente.
 *
 * Devuelve "—" para valores vacíos o que no parseen, incluidas las fechas
 * imposibles ("2026-02-30"), que `new Date` desbordaría a otro día.
 */
export const formatShortCalendarDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  if (value.includes("T")) return formatShortDate(value);
  if (!isValidDateKey(value)) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return formatShortDate(new Date(Date.UTC(year, month - 1, day)), { timeZone: "UTC" });
};

/**
 * Formatea la HORA (es-MX, 12 h: "08:51 a.m.") de un timestamp real con offset
 * propio — pareja de `formatShortDate` para cuando fecha y hora se muestran por
 * separado (p.ej. "14 jul 2026" · "10:32 a.m."). Es para timestamps con hora,
 * no para fechas-calendario (ver nota en `formatShortDate`). Devuelve "—" para
 * valores vacíos o que no parseen.
 *
 * La hora sale en `MEXICO_TIME_ZONE` (la del backend y la de las
 * notificaciones), no en la del navegador: un equipo fuera de México o con la
 * zona mal configurada vería otra hora que el resto del sistema (EC-931).
 * `timeZone` la cambia de forma explícita.
 */
export const formatShortTime = (
  value: string | Date | null | undefined,
  options: { timeZone?: string } = {},
): string => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options.timeZone ?? MEXICO_TIME_ZONE,
  });
};

/**
 * Fecha + hora de un timestamp real como "14 jul 2026 · 10:32 a.m.",
 * combinando `formatShortDate` y `formatShortTime` en la MISMA zona
 * (`MEXICO_TIME_ZONE` por omisión, como `formatShortTime`), para que el día y
 * la hora nunca vengan de zonas distintas. Un solo "—" —y no "— · —"— para
 * valores vacíos o que no parseen.
 */
export const formatShortDateTime = (
  value: string | Date | null | undefined,
  options: { timeZone?: string } = {},
): string => {
  const timeZone = options.timeZone ?? MEXICO_TIME_ZONE;
  const date = formatShortDate(value, { timeZone });
  if (date === "—") return "—";
  return `${date} · ${formatShortTime(value, { timeZone })}`;
};

const CALENDAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MONTH_NAME_FORMAT = new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" });

/**
 * Mes-calendario "YYYY-MM" (p. ej. el `mes` de un KPI del backend) como
 * "Noviembre 2026". El año sale del texto y el nombre del mes de `Intl` sobre
 * el día 1 en UTC, formateado en UTC: no depende de la zona del navegador y no
 * pasa por `new Date("YYYY-MM-DD")`, que en México cae en el día anterior.
 * `null` si el valor no es exactamente "YYYY-MM" con mes 01–12.
 */
export const formatCalendarMonth = (value: string | null | undefined): string | null => {
  const match = CALENDAR_MONTH_PATTERN.exec(value ?? "");
  if (!match) return null;
  const name = MONTH_NAME_FORMAT.format(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${match[1]}`;
};
