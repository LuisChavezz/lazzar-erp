import type { BASE_PDF_COLORS } from "./BasePdfColors";

/**
 * Bloques de estilo compartidos, byte-idénticos, entre `QuotePdfStyles` y
 * `PurchaseOrderPdfStyles` — factorizados aquí para que un ajuste de layout
 * (padding, tipografía, bordes) se aplique a ambos documentos a la vez.
 *
 * No se envuelve en `StyleSheet.create` aquí: cada documento la combina con
 * sus propios estilos específicos dentro de su propio `StyleSheet.create`.
 * `as const` preserva el tipo literal de cada valor (evita que TS ensanche
 * `flexDirection: "row"` a `string`, lo cual `StyleSheet.create` rechaza) y
 * el de cada clave, sin necesitar importar el tipo `Style` de react-pdf
 * (no expuesto como export nombrado por el paquete).
 */
export const basePdfStyles = (C: typeof BASE_PDF_COLORS) => ({
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

  /* ── Tarjetas de información ─────────────────── */
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

  /* ── Tabla ────────────────────────────────────── */
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

  /* ── Totales ─────────────────────────────────── */
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
} as const);
