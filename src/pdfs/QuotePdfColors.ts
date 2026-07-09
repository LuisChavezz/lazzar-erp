/**
 * Paleta de colores del documento PDF de cotización.
 * Centralizada aquí para facilitar ajustes de marca sin tocar estilos ni componentes.
 *
 * Extiende `BASE_PDF_COLORS`, compartida con `PurchaseOrderPdfColors`, para
 * que los tokens comunes a ambos documentos (marca, texto, bordes) se
 * mantengan sincronizados estructuralmente en vez de copiados a mano.
 */
import { BASE_PDF_COLORS } from "./shared/BasePdfColors";

export const PDF_COLORS = {
  ...BASE_PDF_COLORS,
  accentDark: "#0369a1",
  success: "#059669",
  badge: "#f0f9ff",
  badgeBorder: "#bae6fd",
  badgeText: "#0369a1",

  // Bordados
  embBadgeBg: "#e0f2fe",
  embBadgeText: "#0369a1",
  embNotesBg: "#f8fafc",

  // Reflejantes
  reflBorder: "#fde68a",
  reflHeaderBg: "#fef9c3",
  reflHeaderText: "#92400e",
  reflBadgeBg: "#fffbeb",
  reflLabelText: "#b45309",
  reflValueText: "#78350f",

  // Secciones de addons
  addonEmbBg: "#f0f9ff",
  addonEmbText: "#0369a1",
  addonReflBg: "#fffbeb",
  addonReflText: "#92400e",
  addonSleeveBg: "#f0fdf4",
  addonSleeveText: "#15803d",

  // Corte de manga
  sleeveDot: "#16a34a",
  sleeveText: "#15803d",

  // Imagen placeholder
  imagePlaceholderBg: "#f8fafc",
} as const;
