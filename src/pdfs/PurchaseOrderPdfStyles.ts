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

  /* ── Orden cancelada (estatus 6) — específico de OC ── */
  // Marca de agua: capa `fixed` (se repite en cada página) y absoluta (fuera
  // del flujo, no mueve ni pagina el contenido). Se pinta ENCIMA del contenido
  // —las filas de la tabla tienen fondo opaco y la tapaban— con opacidad baja
  // para que todo siga legible debajo.
  watermarkLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkText: {
    fontSize: 44,
    fontFamily: "Helvetica-Bold",
    color: C.statusMark,
    opacity: 0.1,
    transform: "rotate(-35deg)",
    textAlign: "center",
  },
  statusBanner: {
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.statusMarkBorder,
    borderRadius: 4,
    backgroundColor: C.statusMarkBg,
  },
  statusBannerTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.statusMark,
  },
  statusBannerReason: {
    marginTop: 4,
    fontSize: 9,
    color: C.textPrimary,
  },
  statusBannerReasonLabel: {
    fontFamily: "Helvetica-Bold",
  },
  /* ── Pie de página — específico de OC ── */
  // El texto izquierdo (folio + proveedor [+ leyenda de cancelada]) se encoge
  // y parte en líneas en vez de encimarse con "Página X de Y" cuando el nombre
  // del proveedor es largo. Ese número de página es un `Text` con `render`
  // (contenido dinámico) y react-pdf no conoce su ancho al hacer el layout,
  // así que se le reserva uno FIJO —sin él, el texto izquierdo ocupaba todo el
  // renglón y se encimaba—. No se toca `footerText` de la base: lo comparten
  // cotizaciones y facturas.
  footerTextShrink: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    marginRight: 12,
  },
  footerPageNumberFixed: {
    flexShrink: 0,
    // Holgura para "Página 999 de 999" a 7 pt.
    width: 80,
    textAlign: "right",
  },
  footerStatus: {
    fontFamily: "Helvetica-Bold",
    color: C.statusMark,
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
