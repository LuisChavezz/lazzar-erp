/**
 * Paleta de colores del PDF del reporte de movimientos de inventario.
 *
 * Extiende `BASE_PDF_COLORS` — la misma escala de marca que usan los PDF de
 * cotización, orden de compra y el reporte de existencias — para consistencia
 * visual estructural (no copiada a mano). Se mantiene como archivo aparte para
 * que el reporte pueda evolucionar su identidad sin arrastrar la de los otros
 * documentos.
 */
import { BASE_PDF_COLORS } from "./shared/BasePdfColors";

export const STOCK_MOVEMENT_REPORT_PDF_COLORS = {
  ...BASE_PDF_COLORS,
} as const;
