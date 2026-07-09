/**
 * Hoja de estilos del documento PDF de orden de compra.
 *
 * Comparte con `QuotePdfStyles` los bloques que son byte-idénticos entre
 * ambos documentos vía `basePdfStyles` (tipografía Helvetica, tamaños,
 * espaciados, bordes de tabla, tarjetas de información y bloque de
 * totales), y solo declara aquí lo que es específico de la OC (badge de
 * folio, columnas de tabla, tamaño del bloque de totales). Se omiten los
 * estilos de bordados / reflejantes porque una orden de compra no los
 * contiene.
 */
import { StyleSheet } from "@react-pdf/renderer";
import { PO_PDF_COLORS as C } from "./PurchaseOrderPdfColors";
import { basePdfStyles } from "./shared/BasePdfStyles";

export const purchaseOrderPdfStyles = StyleSheet.create({
  ...basePdfStyles(C),

  /* ── Encabezado — específico de OC ────────────── */
  folioBadge: {
    backgroundColor: C.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  folioText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  /* ── Info general (2 columnas) — específico de OC ── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  /* ── Tabla de productos — columnas específicas de OC ── */
  colDescription: { flex: 4 },
  colQty: { flex: 1.2, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colDiscount: { flex: 1.5, textAlign: "right" },
  colAmount: { flex: 1.5, textAlign: "right" },

  emptyRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  emptyText: {
    fontSize: 8,
    color: C.textMuted,
    textAlign: "center",
  },

  /* ── Totales — específico de OC ──────────────── */
  totalsSection: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalsCard: {
    width: "45%",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
  },
});
