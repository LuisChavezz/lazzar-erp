/**
 * Piezas comunes de los PDF de WMS: surtido (picking), embarque (packing) y
 * traspaso (EC-858). Módulo puro, sin `@react-pdf/renderer` (solo sus tipos).
 *
 * Todo se imprime tal como lo manda el backend (EC-882): el SKU, el color y la
 * talla de cada renglón ya vienen resueltos desde la variante surtida, la de
 * catálogo o la de muestra; aquí no se deriva nada.
 */
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { EMPTY_VALUE, textOrDash } from "@/src/utils/textOrDash";
import type { PdfColumn, PdfInfoItem } from "./DocumentPdfLayout";

/** Datos del producto que traen los renglones de los tres documentos. */
export interface WmsPdfLineProduct {
  sku: string | null;
  producto_nombre: string | null;
  producto_variante_nombre: string | null;
  color_nombre: string | null;
  talla_nombre: string | null;
}

/**
 * Nombre del producto del renglón, en el mismo orden que los diálogos de
 * detalle: el de la variante y, si no viene, `producto_nombre` (el del producto
 * o, en una línea de muestra, el de la muestra).
 */
export const wmsLineProductName = (line: WmsPdfLineProduct): string =>
  line.producto_variante_nombre?.trim() || line.producto_nombre?.trim() || EMPTY_VALUE;

/**
 * Columnas SKU, Producto, Color y Talla. SKU y Color van ligadas a su clave
 * (`field`): una respuesta anterior a EC-882 que no las traiga las omite en vez
 * de pintar una columna de guiones.
 */
export function wmsProductColumns<Row extends WmsPdfLineProduct>(): PdfColumn<Row>[] {
  return [
    { id: "sku", header: "SKU", flex: 1.6, field: "sku", cell: (line) => textOrDash(line.sku) },
    { id: "producto", header: "Producto", flex: 3, bold: true, cell: (line) => wmsLineProductName(line) },
    { id: "color", header: "Color", flex: 1.3, field: "color_nombre", cell: (line) => textOrDash(line.color_nombre) },
    { id: "talla", header: "Talla", flex: 0.8, cell: (line) => textOrDash(line.talla_nombre) },
  ];
}

/** Columna de una cantidad del renglón: a la derecha, con la precisión exacta de la pantalla. */
export const wmsQuantityColumn = <Row>(
  id: string,
  header: string,
  value: (line: Row) => string,
): PdfColumn<Row> => ({
  id,
  header,
  flex: 1,
  align: "right",
  cell: (line) => formatExactQuantityValue(value(line)),
});

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
