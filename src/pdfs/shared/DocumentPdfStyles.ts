/**
 * Hoja de estilos de la plantilla base de documentos (`DocumentPdfLayout`,
 * EC-855). Parte de `basePdfStyles` (página, encabezado, tarjetas, tabla,
 * totales, observaciones y pie) y agrega las piezas que nacieron en el PDF de
 * la orden de compra y ahora comparten todos los documentos: insignia de
 * folio, banner de estatus, marca de agua, pie que no se encima con la
 * paginación y tarjetas a dos columnas.
 */
import { StyleSheet } from "@react-pdf/renderer";
import { DOCUMENT_PDF_COLORS as C } from "./DocumentPdfColors";
import { basePdfStyles } from "./BasePdfStyles";

export const documentPdfStyles = StyleSheet.create({
  ...basePdfStyles(C),

  /* ── Encabezado ──────────────────────────────── */
  companyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
  },
  companyRfc: {
    fontSize: 7,
    color: C.textSecondary,
    marginTop: 1,
    marginBottom: 8,
  },
  // Sin empresa no hay renglón de RFC; el título conserva su aire.
  companySpacer: {
    marginBottom: 8,
  },
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
  headerDate: {
    marginTop: 6,
    fontSize: 8,
    color: C.textSecondary,
    textAlign: "right",
  },
  headerDateLabel: {
    color: C.textMuted,
  },

  /* ── Banner de estatus ───────────────────────── */
  statusBanner: {
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    backgroundColor: C.statusInfoBg,
  },
  statusBannerCancelled: {
    borderColor: C.statusMarkBorder,
    backgroundColor: C.statusMarkBg,
  },
  statusBannerTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.textPrimary,
  },
  statusBannerTitleCancelled: {
    color: C.statusMark,
  },
  statusBannerDetail: {
    marginTop: 4,
    fontSize: 9,
    color: C.textPrimary,
  },
  statusBannerDetailLabel: {
    fontFamily: "Helvetica-Bold",
  },

  /* ── Marca de agua (documento cancelado) ─────── */
  // Capa `fixed` (se repite en cada página) y absoluta (fuera del flujo, no
  // mueve ni pagina el contenido). Va ENCIMA del contenido —las filas de la
  // tabla tienen fondo opaco y la tapaban— con opacidad baja para que todo
  // siga legible debajo.
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

  /* ── Pie de página ───────────────────────────── */
  // El texto izquierdo se encoge y parte en líneas en vez de encimarse con
  // "Página X de Y". Ese número es un `Text` con `render` (contenido
  // dinámico) y react-pdf no conoce su ancho al hacer el layout, así que se
  // le reserva uno FIJO.
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

  /* ── Tarjetas a dos columnas ─────────────────── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  /* ── Tabla de renglones ──────────────────────── */
  section: {
    marginBottom: 4,
  },
  cellRight: {
    textAlign: "right",
  },
  cellCaption: {
    fontSize: 7,
    color: C.textMuted,
    marginTop: 1,
  },
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

  /* ── Totales ─────────────────────────────────── */
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
