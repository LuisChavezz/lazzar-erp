/**
 * Hoja de estilos del PDF del reporte de inventario.
 *
 * Comparte con los PDF de cotización y orden de compra los bloques
 * byte-idénticos vía `basePdfStyles` (tipografía Helvetica, tarjetas de info,
 * bordes de tabla, pie de página), y solo declara aquí lo específico del
 * reporte: layout de dos columnas, bloque de resumen del periodo y el ancho de
 * las 11 columnas de la tabla de existencias.
 */
import { StyleSheet } from "@react-pdf/renderer";
import { STOCK_REPORT_PDF_COLORS as C } from "./StockReportPdfColors";
import { basePdfStyles } from "./shared/BasePdfStyles";

export const stockReportPdfStyles = StyleSheet.create({
  ...basePdfStyles(C),

  /* ── Info general (2 columnas) ─────────────────── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  /* ── Resumen del periodo (bloque compacto de celdas) ── */
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
  },

  /* ── Columnas de la tabla de existencias ───────── */
  // `paddingRight` en CADA columna, mismo valor que
  // `StockMovementReportPdfStyles.ts`: sin él, columnas contiguas quedan sin
  // ningún espacio entre sus cajas y el contenido de una (p. ej. un nombre de
  // producto largo) puede visualmente pegarse con el de la siguiente. También
  // se redistribuye ancho: "SKU" tenía más margen del que necesita su
  // contenido típico, y "Almacén" muy poco (nombres largos como "PRODUCTO
  // TERMINADO" se partían a mitad de palabra, mismo problema ya corregido en
  // el reporte de movimientos).
  colSku: { flex: 1.6, paddingRight: 6 },
  colProducto: { flex: 2.6, paddingRight: 6 },
  colColor: { flex: 1.6, paddingRight: 6 },
  colTalla: { flex: 1.4, paddingRight: 6 },
  colAlmacen: { flex: 2.6, paddingRight: 6 },
  colNum: { flex: 1.4, textAlign: "right", paddingRight: 6 },
  colMoney: { flex: 1.7, textAlign: "right", paddingRight: 6 },
});
