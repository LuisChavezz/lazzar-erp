/**
 * Quincenas de calendario: del 1 al 15 (`half` 1) y del 16 al último día del
 * mes (`half` 2). El rango SIEMPRE se deriva de mes + mitad, nunca se captura:
 * así ningún periodo puede quedar a medias o cruzar de mes.
 *
 * Todo trabaja sobre cadenas "YYYY-MM-DD" y aritmética de enteros, sin pasar
 * por `Date` locales, para que ninguna zona horaria desplace un día. Es
 * calendario PURO: "la quincena en curso en México" vive en `mexicoTime.ts`
 * (`getMexicoCurrentQuincena`, `getMexicoFortnightRange`), que se apoya aquí.
 */

export type QuincenaHalf = 1 | 2;

export interface Quincena {
  year: number;
  /** 1–12. */
  month: number;
  half: QuincenaHalf;
}

export interface QuincenaRange {
  periodo_inicio: string;
  periodo_fin: string;
}

/** Nombres de mes en español, indexados por `month - 1`. */
export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const pad = (value: number): string => String(value).padStart(2, "0");

/** Nombre del mes (1–12); `""` fuera de rango. */
export const getMonthLabel = (month: number): string => MESES[month - 1] ?? "";

/**
 * Último día de `month` (1–12) de `year`: 28/29 en febrero según el año
 * bisiesto, 30 o 31 en el resto. Calendario puro, sin zona horaria.
 */
export const lastDayOfMonth = (year: number, month: number): number =>
  // Día 0 del mes siguiente = último día de este mes.
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** `true` si `value` es un día REAL "YYYY-MM-DD" (rechaza 2026-02-30). */
const isDateKey = (value: string | null | undefined): value is string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= lastDayOfMonth(year, month);
};

/** Primer y último día de la quincena como "YYYY-MM-DD". */
export const getQuincenaRange = ({ year, month, half }: Quincena): QuincenaRange => {
  const prefix = `${String(year).padStart(4, "0")}-${pad(month)}`;
  return half === 1
    ? { periodo_inicio: `${prefix}-01`, periodo_fin: `${prefix}-15` }
    : {
        periodo_inicio: `${prefix}-16`,
        periodo_fin: `${prefix}-${pad(lastDayOfMonth(year, month))}`,
      };
};

/** Quincena a la que pertenece un día "YYYY-MM-DD" (válido). */
export const quincenaOfDateKey = (dateKey: string): Quincena => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, half: day <= 15 ? 1 : 2 };
};

/**
 * Inversa de `getQuincenaRange`: la quincena cuyo rango es EXACTAMENTE
 * `periodo_inicio`–`periodo_fin`, o `null` si el par no es una quincena
 * completa (otro corte, fechas inválidas, extremos de meses distintos).
 */
export const quincenaFromRange = (
  periodoInicio: string | null | undefined,
  periodoFin: string | null | undefined
): Quincena | null => {
  if (!isDateKey(periodoInicio) || !isDateKey(periodoFin)) {
    return null;
  }
  const quincena = quincenaOfDateKey(periodoInicio);
  const range = getQuincenaRange(quincena);
  return range.periodo_inicio === periodoInicio && range.periodo_fin === periodoFin
    ? quincena
    : null;
};

/** ¿Son la misma quincena? */
export const isSameQuincena = (a: Quincena, b: Quincena): boolean =>
  a.year === b.year && a.month === b.month && a.half === b.half;

/** Rango de días de la mitad, p. ej. "1–15" o "16–28". */
export const getQuincenaDaysLabel = (quincena: Quincena): string => {
  const { periodo_inicio, periodo_fin } = getQuincenaRange(quincena);
  return `${Number(periodo_inicio.slice(8))}–${Number(periodo_fin.slice(8))}`;
};

/** Etiqueta legible, p. ej. "1–15 de octubre de 2026". */
export const formatQuincena = (quincena: Quincena): string =>
  `${getQuincenaDaysLabel(quincena)} de ${getMonthLabel(quincena.month).toLowerCase()} de ${quincena.year}`;

/**
 * Clave compacta para la URL: "2026-10-1" (año, mes, mitad). Con
 * `parseQuincenaKey` como inversa.
 */
export const toQuincenaKey = ({ year, month, half }: Quincena): string =>
  `${year}-${pad(month)}-${half}`;

/** Inversa de `toQuincenaKey`; `null` si no es una clave válida. */
export const parseQuincenaKey = (value: string | null | undefined): Quincena | null => {
  const match = /^(\d{4})-(\d{2})-([12])$/.exec(value ?? "");
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1900 || month < 1 || month > 12) {
    return null;
  }
  return { year, month, half: Number(match[3]) as QuincenaHalf };
};
