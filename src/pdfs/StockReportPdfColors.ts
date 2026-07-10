/**
 * Paleta de colores del PDF del reporte de inventario.
 *
 * Extiende `BASE_PDF_COLORS` — la misma escala de marca que usan los PDF de
 * cotización y orden de compra — para consistencia visual estructural (no
 * copiada a mano). Se mantiene como archivo aparte para que el reporte pueda
 * evolucionar su identidad sin arrastrar la de los otros documentos.
 */
import { BASE_PDF_COLORS } from "./shared/BasePdfColors";

export const STOCK_REPORT_PDF_COLORS = {
  ...BASE_PDF_COLORS,
} as const;
