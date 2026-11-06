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
 * Igual que `firstDrfMessage`, pero descarta también los strings que solo traen
 * espacios: para el texto de un toast, que nunca debe salir en blanco.
 */
export function firstNonBlankDrfMessage(value: unknown): string | undefined {
  return (Array.isArray(value) ? value : [value]).find(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
}

/**
 * Igual que `firstRejectionMessage`, con `firstNonBlankDrfMessage`: una clave
 * cuyo mensaje está en blanco se salta y se sigue con la siguiente.
 */
export function firstNonBlankRejectionMessage(
  data: unknown,
  keys: readonly string[],
): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of keys) {
    const message = firstNonBlankDrfMessage(body[key]);
    if (message) return message;
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
  return firstRejection(data, keys)?.message;
}

/**
 * Igual que `firstRejectionMessage`, pero dice también de qué clave salió el
 * mensaje: para quien decide qué hacer según el campo rechazado (p. ej. mostrar
 * unos rechazos junto a un control y el resto en el toast).
 */
export function firstRejection<K extends string>(
  data: unknown,
  keys: readonly K[],
): { key: K; message: string } | undefined {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of keys) {
    const message = firstDrfMessage(body[key]);
    if (message) return { key, message };
  }
  return undefined;
}

/**
 * TODOS los mensajes de un rechazo que llega como lista (un mensaje por
 * elemento afectado), unidos con `separator`; `undefined` si la clave no viene
 * o no trae ningún mensaje. Acepta también el string suelto. A diferencia de
 * `firstDrfMessage`, descarta los strings que solo traen espacios, así que
 * nunca produce un mensaje en blanco.
 */
export function extractJoinedRejectionMessage(
  data: unknown,
  key: string,
  separator = " ",
): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const value = (data as Record<string, unknown>)[key];
  const messages = (Array.isArray(value) ? value : [value]).filter(
    (message): message is string => typeof message === "string" && message.trim().length > 0,
  );
  return messages.length > 0 ? messages.join(separator) : undefined;
}
