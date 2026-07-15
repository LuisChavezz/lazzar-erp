/**
 * Hoja de estilos del documento PDF de factura.
 *
 * Comparte con `QuotePdfStyles` / `PurchaseOrderPdfStyles` los bloques que son
 * byte-idénticos entre los tres documentos vía `basePdfStyles` (tipografía
 * Helvetica, tamaños, espaciados, bordes de tabla, tarjetas de información y
 * bloque de totales), y solo declara aquí lo que es específico de la factura
 * (badge de folio, badge de estatus, columnas de tabla, tamaño del bloque de
 * totales).
 */
import { StyleSheet } from "@react-pdf/renderer";
import { INVOICE_PDF_COLORS as C } from "./InvoicePdfColors";
import { basePdfStyles } from "./shared/BasePdfStyles";

export const invoicePdfStyles = StyleSheet.create({
  ...basePdfStyles(C),

  /* ── Encabezado — específico de factura ────────── */
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
  // Badge de estatus — neutro (sin color por estatus) para no duplicar aquí la
  // configuración de colores de estatus; el estatus se INCLUYE de forma
  // deliberada (a diferencia de la OC) porque en una factura es información
  // fiscal/de pago relevante para el cliente, igual que el PDF de cotización
  // muestra su estatus.
  statusBadge: {
    marginTop: 6,
    backgroundColor: C.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-end",
  },
  statusText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.textSecondary,
    letterSpacing: 0.5,
  },

  /* ── Info general (2 columnas) — específico de factura ── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  /* ── Tabla de conceptos — columnas específicas de factura ── */
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

  /* ── Totales — específico de factura ───────────── */
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
