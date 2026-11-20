import { formatShortCalendarDate, formatShortDate } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

/**
 * Columna de la exportación (Excel y PDF) de un listado: lo mismo que muestra
 * la tabla, en texto plano. `weight` es el ancho relativo en el PDF.
 */
export interface ListExportColumn<T> {
  header: string;
  weight: number;
  text: (row: T) => string;
}

const escapeCsv = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** CSV (con BOM, para que Excel lea acentos) de las filas ya filtradas. */
export const buildListCsv = <T>(columns: readonly ListExportColumn<T>[], rows: readonly T[]): string =>
  `﻿${[columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.text(row)))]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\n")}`;

/** Número leído con tolerancia (`null`, `""`, decimales como texto) → 0. */
export const exportNum = (value: unknown): number => Number(value) || 0;

/**
 * Fecha de una exportación como "14 jul 2026", en el día de México: un datetime
 * con `MEXICO_TIME_ZONE`; una fecha-calendario ("AAAA-MM-DD") sin correr el día.
 * Vacío → "".
 */
export const exportDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const text = value.includes("T")
    ? formatShortDate(value, { timeZone: MEXICO_TIME_ZONE })
    : formatShortCalendarDate(value);
  return text === "—" ? "" : text;
};
