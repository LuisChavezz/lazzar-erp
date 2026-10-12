/**
 * Primer mensaje utilizable de un valor de error de Django REST Framework:
 * puede llegar como un string plano o como un array de strings (convención
 * estándar de "errores de campo" de DRF). Ignora entradas vacías o no-string.
 *
 * Extraído de `parseStockTransferError` (stock-transfers), que ya lo resolvía
 * así; `useCreateStockMovement` (y el antiguo alta de facturas desde pedido) reimplementaban
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

/**
 * Primer mensaje de RECHAZO de un cuerpo 400: recorre `keys` en orden y
 * devuelve el primero que `firstDrfMessage` sepa leer, o `undefined` si el
 * cuerpo no es un objeto o ninguna clave trae un mensaje plano.
 *
 * Cada endpoint decide SUS claves (las que no corresponden a ningún campo del
 * formulario y por eso van al toast); aquí solo vive el recorrido, que antes
 * estaba copiado en cada hook de mutación.
 */
export function firstRejectionMessage(
  data: unknown,
  keys: readonly string[],
): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of keys) {
    const message = firstDrfMessage(body[key]);
    if (message) return message;
  }
  return undefined;
}
