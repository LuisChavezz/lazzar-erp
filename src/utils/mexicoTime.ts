/**
 * Fechas y horas en la zona horaria del BACKEND (`TIME_ZONE` de nucleo-erp),
 * no en la del navegador.
 *
 * Los helpers de `formatDate.ts` trabajan en la zona LOCAL del navegador, que
 * es lo correcto para mostrar fechas-calendario. Aquí se necesita otra cosa:
 * el backend interpreta una hora local de checada ("YYYY-MM-DD HH:MM:SS") en
 * `America/Mexico_City` y exige que su día local coincida con `fecha`. Si el
 * navegador estuviera en otra zona, anclarse a la suya enviaría otro instante
 * u otro día.
 *
 * Todo pasa por `Intl` con la zona IANA, nunca por un offset fijo (como el
 * `-06:00` de `normalizeDate.ts`): así las fechas anteriores a 2022, con
 * horario de verano, también reciben su offset correcto.
 */

import { getQuincenaRange, quincenaOfDateKey, type Quincena } from "./quincena";

export const MEXICO_TIME_ZONE = "America/Mexico_City";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINUTE_MS = 60_000;

/** Crear un `Intl.DateTimeFormat` es caro: uno solo para todo el módulo. */
const wallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MEXICO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  // `h23` y no `hour12: false`: algunos motores formatean la medianoche como "24".
  hourCycle: "h23",
});

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** Fecha y hora de pared en México del instante `date`. */
const toWallClock = (date: Date): WallClock => {
  const parts = wallClockFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
};

const wallClockDateKey = (wall: WallClock): string =>
  `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;

/**
 * `true` si `value` es un día calendario REAL en formato "YYYY-MM-DD". Rechaza
 * las fechas que `Date.UTC` "normaliza" (p. ej. 2026-02-30 → 2 de marzo).
 */
export const isCalendarDateKey = (value: string | null | undefined): value is string => {
  if (!value || !DATE_KEY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/** `true` si `value` es una hora "HH:MM" de 24 h (lo que produce `<input type="time">`). */
export const isHHMM = (value: string | null | undefined): value is string =>
  Boolean(value && HHMM_PATTERN.test(value));

/** Fecha de HOY en México como "YYYY-MM-DD", sin importar la zona del navegador. */
export const getMexicoTodayDate = (now: Date = new Date()): string =>
  wallClockDateKey(toWallClock(now));

/**
 * Hora local de México con el formato que esperan las acciones del checador
 * (`hora` de `registrar_entrada/` y `registrar_salida/`): "YYYY-MM-DD HH:MM:SS".
 * Los segundos van en `00`: el `<input type="time">` captura minutos. `null`
 * si la fecha o la hora no son válidas.
 */
export const toMexicoLocalTimestamp = (fecha: string, hhmm: string): string | null =>
  isCalendarDateKey(fecha) && isHHMM(hhmm) ? `${fecha} ${hhmm}:00` : null;

/** Minutos que la zona de México está adelantada (negativo: atrasada) respecto a UTC en `instant`. */
const mexicoOffsetMinutesAt = (instant: number): number => {
  const wall = toWallClock(new Date(instant));
  const wallAsUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );
  // El formateador no da milisegundos: se comparan segundos completos.
  return Math.round((wallAsUtc - Math.floor(instant / 1000) * 1000) / MINUTE_MS);
};

const formatOffset = (offsetMinutes: number): string => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
};

/**
 * Datetime ISO con el offset de México VIGENTE ese día a esa hora, a partir de
 * `fecha` ("YYYY-MM-DD") y una hora local "HH:MM", p. ej.
 * "2026-09-28T08:05:00-06:00". Es lo que viaja en `hora_entrada`/`hora_salida`
 * al crear o corregir un registro.
 *
 * El offset se resuelve en dos pasadas: la primera con el offset del instante
 * aproximado y la segunda con el del instante resultante, que es la que cuenta
 * cerca de un cambio de horario. Si la hora no existe en México (el salto de
 * horario de verano de un año anterior a 2022), devuelve `null`. También con
 * una fecha u hora inválidas.
 */
export const toMexicoIsoDateTime = (fecha: string, hhmm: string): string | null => {
  if (!isCalendarDateKey(fecha) || !isHHMM(hhmm)) {
    return null;
  }
  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  let offset = mexicoOffsetMinutesAt(wallAsUtc);
  const secondOffset = mexicoOffsetMinutesAt(wallAsUtc - offset * MINUTE_MS);
  if (secondOffset !== offset) {
    offset = secondOffset;
  }

  const instant = wallAsUtc - offset * MINUTE_MS;
  const wall = toWallClock(new Date(instant));
  if (wallClockDateKey(wall) !== fecha || wall.hour !== hour || wall.minute !== minute) {
    return null;
  }
  return `${fecha}T${hhmm}:00${formatOffset(offset)}`;
};

/**
 * Hora local de México ("HH:MM") de un datetime ISO de la API, para mostrarla
 * y para sembrar un `<input type="time">`. Devuelve "" si no hay valor o no
 * parsea.
 */
export const getMexicoTimeHHMM = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const wall = toWallClock(date);
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
};

/** Quincena en curso en México (año, mes, mitad), sin importar la zona del navegador. */
export const getMexicoCurrentQuincena = (now: Date = new Date()): Quincena =>
  quincenaOfDateKey(getMexicoTodayDate(now));

/**
 * Quincena en curso en México: del 1 al 15, o del 16 al último día del mes.
 * Ambos extremos como "YYYY-MM-DD", listos para `fecha__gte`/`fecha__lte`.
 * El corte vive en `quincena.ts` (`getQuincenaRange`), la única definición.
 */
export const getMexicoFortnightRange = (
  now: Date = new Date()
): { desde: string; hasta: string } => {
  const { periodo_inicio, periodo_fin } = getQuincenaRange(getMexicoCurrentQuincena(now));
  return { desde: periodo_inicio, hasta: periodo_fin };
};
