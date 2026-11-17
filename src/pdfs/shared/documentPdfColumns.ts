/**
 * Columnas y renglones de tarjeta que solo aparecen si algún renglón trae el
 * dato (EC-858, compartido desde EC-859 con los PDF de Finanzas). Módulo puro,
 * sin `@react-pdf/renderer` (solo sus tipos).
 *
 * Distinto de `PdfColumn.field` (`documentPdfModel.ts`): `field` decide por la
 * PRESENCIA de una clave (un importe que el backend quita por rol); estos
 * helpers deciden por el VALOR (una talla o una ubicación vacías en todos los
 * renglones no ocupan columna).
 */
import type { PdfColumn, PdfInfoItem } from "./DocumentPdfLayout";

/** ¿Algún renglón trae un valor (no vacío) en ese dato? Decide las columnas condicionales. */
export const rowsHaveValue = <Row>(
  rows: readonly Row[],
  value: (row: Row) => string | number | null | undefined,
): boolean =>
  rows.some((row) => {
    const dato = value(row);
    return typeof dato === "number" || Boolean(dato?.trim());
  });

/**
 * La columna solo si algún renglón trae el dato, como la de talla en la
 * recepción: ubicación, caja… vacías en todos los renglones no ocupan espacio.
 */
export const conditionalColumn = <Row>(
  rows: readonly Row[],
  value: (row: Row) => string | number | null | undefined,
  column: PdfColumn<Row>,
): PdfColumn<Row>[] => (rowsHaveValue(rows, value) ? [column] : []);

/** Renglón de una tarjeta solo si el dato viene (oleada, zona…). */
export const optionalInfoItem = (label: string, value: string | null | undefined): PdfInfoItem[] =>
  value?.trim() ? [{ label, value: value.trim() }] : [];
