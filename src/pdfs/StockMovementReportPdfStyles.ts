/**
 * Hoja de estilos del PDF del reporte de movimientos de inventario.
 *
 * Comparte con los PDF de cotización, orden de compra y existencias los bloques
 * byte-idénticos vía `basePdfStyles` (tipografía Helvetica, tarjetas de info,
 * bordes de tabla, pie de página), y solo declara aquí lo específico del
 * reporte: layout de dos columnas, bloque de resumen del periodo y el ancho de
 * las columnas de la tabla de movimientos.
 */
import { StyleSheet } from "@react-pdf/renderer";
import { STOCK_MOVEMENT_REPORT_PDF_COLORS as C } from "./StockMovementReportPdfColors";
import { basePdfStyles } from "./shared/BasePdfStyles";

export const stockMovementReportPdfStyles = StyleSheet.create({
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

  /* ── Columnas de la tabla de movimientos ───────── */
  // `paddingRight` en CADA columna (no un `gap` en la fila): a diferencia del
  // PDF de existencias (que nunca coloca una columna alineada a la derecha
  // justo antes de una alineada a la izquierda), aquí "Costo Total" (derecha)
  // antecede a "Usuario" (izquierda) — sin este padding ambos textos empujan
  // hacia el mismo borde compartido de las cajas y quedan pegados.
  colFecha: { flex: 1.8, paddingRight: 6 },
  // Hora debajo de la fecha en la celda "Fecha", espejo del apilado de la
  // tabla en pantalla (`StockMovementReportColumns`).
  tableCellSub: {
    fontSize: 6.5,
    color: C.textMuted,
    marginTop: 1,
  },
  colTipo: { flex: 1, paddingRight: 6 },
  colProducto: { flex: 3.2, paddingRight: 6 },
  colAlmacen: { flex: 2.4, paddingRight: 6 },
  colUbicacion: { flex: 2, paddingRight: 6 },
  colCantidad: { flex: 1.1, textAlign: "right", paddingRight: 6 },
  colCosto: { flex: 1.4, textAlign: "right", paddingRight: 6 },
  colUsuario: { flex: 2.2, paddingRight: 6 },
});
