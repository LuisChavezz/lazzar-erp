/**
 * Paleta de la plantilla base de documentos (`DocumentPdfLayout`, EC-855).
 * Extiende `BASE_PDF_COLORS` —la misma escala de marca de cotización y
 * factura— con los tokens de la marca de cancelado y del banner de estatus.
 */
import { BASE_PDF_COLORS } from "./BasePdfColors";

export const DOCUMENT_PDF_COLORS = {
  ...BASE_PDF_COLORS,
  // Leyenda, banner y marca de agua de un documento cancelado.
  statusMark: "#b91c1c",
  statusMarkBg: "#fef2f2",
  statusMarkBorder: "#fecaca",
  // Banner de estatus informativo (no cancelado).
  statusInfoBg: "#f8fafc",
} as const;
