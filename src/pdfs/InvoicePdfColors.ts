/**
 * Paleta de colores del documento PDF de factura.
 *
 * Extiende `BASE_PDF_COLORS` —la misma escala de marca que usan los PDF de
 * cotización y orden de compra— para garantizar consistencia visual entre los
 * tres documentos de forma estructural (no copiada a mano), pero se mantiene
 * como archivo aparte para que la factura pueda evolucionar su identidad sin
 * arrastrar la de los otros documentos. Aquí solo se incluyen los tokens que el
 * documento de factura realmente usa.
 */
import { BASE_PDF_COLORS } from "./shared/BasePdfColors";

export const INVOICE_PDF_COLORS = {
  ...BASE_PDF_COLORS,
} as const;
