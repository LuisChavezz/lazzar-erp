/**
 * Tokens de color compartidos, byte-idénticos, entre `QuotePdfColors` y
 * `PurchaseOrderPdfColors` — factorizados aquí para que un ajuste de marca
 * se aplique a ambos documentos a la vez en vez de tener que sincronizarlo
 * manualmente en dos archivos. Cada documento extiende esta base con sus
 * propios tokens específicos.
 */
export const BASE_PDF_COLORS = {
  brand: "#0f172a",
  accent: "#0ea5e9",
  white: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  rowAlt: "#f8fafc",
} as const;
