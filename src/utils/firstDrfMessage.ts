/**
 * Primer mensaje utilizable de un valor de error de Django REST Framework:
 * puede llegar como un string plano o como un array de strings (convención
 * estándar de "errores de campo" de DRF). Ignora entradas vacías o no-string.
 *
 * Extraído de `parseStockTransferError` (stock-transfers), que ya lo resolvía
 * así; `useCreateInvoiceFromOrder` y `useCreateStockMovement` reimplementaban
 * una versión más simple (`Array.isArray(v) ? v[0] : v`, sin saltar entradas
 * vacías) del mismo problema.
 */
export function firstDrfMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.length > 0) return entry;
    }
  }
  return undefined;
}
