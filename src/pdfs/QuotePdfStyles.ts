/**
 * Hoja de estilos del documento PDF de cotización.
 * Importa los colores de QuotePdfColors y los transforma con StyleSheet.create
 * para que @react-pdf/renderer los aplique eficientemente.
 *
 * Comparte con `PurchaseOrderPdfStyles` los bloques que son byte-idénticos
 * entre ambos documentos vía `basePdfStyles`, y solo declara aquí lo que es
 * específico de cotización (badge de folio + estatus, tarjeta de envío,
 * columnas de tabla, addons de bordado/reflejante/manga).
 */
import { StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS as C } from "./QuotePdfColors";
import { basePdfStyles } from "./shared/BasePdfStyles";

export const pdfStyles = StyleSheet.create({
  ...basePdfStyles(C),

  /* ── Encabezado — específico de cotización ───── */
  quoteIdBadge: {
    backgroundColor: C.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  quoteIdText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  statusBadge: {
    backgroundColor: C.badge,
    borderWidth: 1,
    borderColor: C.badgeBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.badgeText,
  },

  /* ── Info general (2 columnas) — específico de cotización ── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  shippingCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  shippingField: {
    marginBottom: 8,
  },
  shippingFieldLast: {
    marginBottom: 0,
  },
  shippingLabel: {
    fontSize: 8,
    color: C.textMuted,
    marginBottom: 3,
  },
  shippingValue: {
    fontSize: 8.5,
    color: C.textPrimary,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },

  /* ── Tabla de productos — columnas específicas de cotización ── */
  colProduct: { flex: 3 },
  colSizes: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },

  /* ── Totales — específico de cotización ──────── */
  totalsSection: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  totalsCard: {
    width: "42%",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    overflow: "hidden",
  },

  /* ── Addons por producto: contenedor y encabezado ── */
  addonSection: {
    marginTop: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  addonSectionHeaderEmbroidery: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.addonEmbBg,
  },
  addonSectionHeaderReflective: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.addonReflBg,
  },
  addonSectionHeaderSleeve: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.addonSleeveBg,
  },
  addonSectionHeaderTextEmbroidery: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.addonEmbText,
    letterSpacing: 1,
  },
  addonSectionHeaderTextReflective: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.addonReflText,
    letterSpacing: 1,
  },
  addonSectionHeaderTextSleeve: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.addonSleeveText,
    letterSpacing: 1,
  },
  addonBody: {
    padding: 8,
    gap: 6,
  },

  /* ── Grupos de bordado ───────────────────────── */
  embGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  embGroupLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.embBadgeText,
    backgroundColor: C.embBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  embGroupSizes: {
    fontSize: 7,
    color: C.textMuted,
  },
  embGroupNotes: {
    fontSize: 7,
    color: C.textSecondary,
    marginBottom: 5,
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: C.embNotesBg,
    borderRadius: 3,
  },
  embLocationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  embLocationCard: {
    width: "48%",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: C.white,
  },
  embLocationInfo: {
    flex: 1,
    padding: 5,
    gap: 2,
  },
  embLocationTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
  },
  embLocationDetail: {
    fontSize: 7,
    color: C.textSecondary,
  },
  embLocationImageBox: {
    width: 56,
    backgroundColor: C.imagePlaceholderBg,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  embLocationImage: {
    width: 50,
    height: 42,
    objectFit: "contain",
  },
  embLocationImagePlaceholder: {
    width: 50,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  embLocationImagePlaceholderText: {
    fontSize: 6,
    color: C.textMuted,
    textAlign: "center",
  },

  /* ── Grupos de reflejante ────────────────────── */
  reflGroupWrapper: {
    borderWidth: 1,
    borderColor: C.reflBorder,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  reflGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.reflHeaderBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reflGroupHeaderLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.reflHeaderText,
  },
  reflGroupSizes: {
    fontSize: 7,
    color: C.reflHeaderText,
  },
  reflSpecsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    padding: 6,
  },
  reflSpecBadge: {
    flexDirection: "column",
    gap: 1,
    borderWidth: 1,
    borderColor: C.reflBorder,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: C.reflBadgeBg,
    minWidth: "30%",
  },
  reflSpecLabel: {
    fontSize: 6,
    color: C.reflLabelText,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  reflSpecValue: {
    fontSize: 7,
    color: C.reflValueText,
  },

  /* ── Corte de manga ──────────────────────────── */
  sleeveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sleeveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.sleeveDot,
  },
  sleeveBadgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.sleeveText,
  },
});
