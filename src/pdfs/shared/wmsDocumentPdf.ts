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
import type { PdfColumn } from "./DocumentPdfLayout";

/**
 * Datos del producto que traen los renglones de los tres documentos. `sku`,
 * `color_nombre` y la talla del traspaso son de EC-882: opcionales, como en
 * los tipos de cada documento.
 */
export interface WmsPdfLineProduct {
  sku?: string | null;
  producto_nombre: string | null;
  producto_variante_nombre: string | null;
  color_nombre?: string | null;
  talla_nombre?: string | null;
}

/**
 * Nombre del producto del renglón, en el mismo orden que los diálogos de
 * detalle: el de la variante y, si no viene, `producto_nombre` (el del producto
 * o, en una línea de muestra, el de la muestra).
 */
export const wmsLineProductName = (line: WmsPdfLineProduct): string =>
  line.producto_variante_nombre?.trim() || line.producto_nombre?.trim() || EMPTY_VALUE;

/*
 * Anchos de las tablas de WMS (EC-891). El `flex` va en decenas de punto: con
 * todas las columnas visibles, 1 de flex da ~10 pt de texto (la fila reparte
 * su ancho, 513 pt, DESPUÉS de restar los 6 pt de relleno de cada celda). Cada
 * columna tiene lo que pide su contenido más largo —el SKU `10012-100-2XCH`, la
 * ubicación `CF-05-05-06`, una cantidad de cinco cifras, el estatus y cada
 * palabra del encabezado— más ~4 pt de holgura; el producto se lleva lo que
 * sobra. Con menos columnas, todas crecen en la misma proporción.
 */

/**
 * Columnas SKU, Producto, Color y Talla. SKU y Color van ligadas a su clave
 * (`field`): una respuesta anterior a EC-882 que no las traiga las omite en vez
 * de pintar una columna de guiones.
 *
 * Cada documento da el ancho del producto (`productoFlex`): es la columna que
 * absorbe el espacio libre, que depende de cuántas columnas tiene su tabla. Un
 * nombre que no cabe se parte en renglones entre palabras y, si una palabra es
 * más ancha que la columna, con la separación silábica de react-pdf.
 */
export function wmsProductColumns<Row extends WmsPdfLineProduct>(productoFlex: number): PdfColumn<Row>[] {
  return [
    { id: "sku", header: "SKU", flex: 6.65, field: "sku", cell: (line) => textOrDash(line.sku) },
    { id: "producto", header: "Producto", flex: productoFlex, bold: true, cell: (line) => wmsLineProductName(line) },
    { id: "color", header: "Color", flex: 4.45, field: "color_nombre", cell: (line) => textOrDash(line.color_nombre) },
    { id: "talla", header: "Talla", flex: 2.55, cell: (line) => textOrDash(line.talla_nombre) },
  ];
}

/**
 * Columna de una cantidad del renglón: a la derecha, con la precisión exacta de
 * la pantalla. El ancho lo pide su encabezado, más ancho que la cantidad.
 */
export const wmsQuantityColumn = <Row>(
  id: string,
  header: string,
  flex: number,
  value: (line: Row) => string,
): PdfColumn<Row> => ({
  id,
  header,
  flex,
  align: "right",
  cell: (line) => formatExactQuantityValue(value(line)),
});
