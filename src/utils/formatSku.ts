/**
 * SKU legible: producto (4) / color (3) / talla (resto).
 * `200480128` → `2004/801/28`, `2004801` → `2004/801`. Solo para mostrar:
 * se busca, copia y envía el SKU sin separadores. Un SKU que no empieza con 7 dígitos (producto+color) o
 * es más corto se devuelve tal cual.
 */
export function formatSku(sku: string | null | undefined): string {
  if (!sku) return "";
  if (!/^\d{7}/.test(sku)) return sku;
  const parts = [sku.slice(0, 4), sku.slice(4, 7), sku.slice(7)].filter(Boolean);
  return parts.join("/");
}
