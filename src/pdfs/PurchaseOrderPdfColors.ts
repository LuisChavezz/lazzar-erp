/**
 * Paleta de colores del documento PDF de orden de compra.
 *
 * Extiende `BASE_PDF_COLORS` — la misma escala de marca que usa el PDF de
 * cotización (`QuotePdfColors`) — para garantizar consistencia visual entre
 * ambos documentos de forma estructural (no copiada a mano), pero se
 * mantiene como archivo aparte para que la OC pueda evolucionar su
 * identidad sin arrastrar la de cotizaciones. Aquí solo se incluyen los
 * tokens que el documento de OC realmente usa (sin bordados ni reflejantes,
 * que no aplican a una orden de compra).
 */
import { BASE_PDF_COLORS } from "./shared/BasePdfColors";

export const PO_PDF_COLORS = {
  ...BASE_PDF_COLORS,
} as const;
