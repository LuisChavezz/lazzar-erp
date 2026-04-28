/**
 * Hoja de estilos del documento PDF de cotización.
 * Importa los colores de QuotePdfColors y los transforma con StyleSheet.create
 * para que @react-pdf/renderer los aplique eficientemente.
 */
import { StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS as C } from "./QuotePdfColors";

export const pdfStyles = StyleSheet.create({
  /* ── Página ───────────────────────────────────── */
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.textPrimary,
    backgroundColor: C.white,
  },

  /* ── Encabezado ──────────────────────────────── */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
  },
  headerLeft: {
    flex: 1,
  },
  brandLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    marginBottom: 2,
  },
  docSubtitle: {
    fontSize: 9,
    color: C.textSecondary,
  },
  headerRight: {
    alignItems: "flex-end",
  },
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

  /* ── Info general (2 columnas) ──────────────── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 12,
  },
  cardTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: C.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 8,
    color: C.textPrimary,
    fontFamily: "Helvetica-Bold",
    flex: 2,
    textAlign: "right",
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

  /* ── Tabla de productos ──────────────────────── */
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.brand,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tableRowAlt: {
    backgroundColor: C.rowAlt,
  },
  tableCell: {
    fontSize: 8,
    color: C.textSecondary,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
  },
  colProduct: { flex: 3 },
  colSizes: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },

  /* ── Totales ─────────────────────────────────── */
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
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: C.brand,
  },
  totalsLabel: {
    fontSize: 8,
    color: C.textSecondary,
  },
  totalsValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
  },
  totalsFinalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.textMuted,
  },
  totalsFinalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  /* ── Observaciones ───────────────────────────── */
  obsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 12,
  },
  obsText: {
    fontSize: 8,
    color: C.textSecondary,
    lineHeight: 1.5,
  },

  /* ── Pie de página ───────────────────────────── */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: {
    fontSize: 7,
    color: C.textMuted,
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
