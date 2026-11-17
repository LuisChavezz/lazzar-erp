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

/** Claves de DRF que describen el error completo: ganan a un campo suelto. */
const DRF_GENERAL_KEYS = ["detail", "non_field_errors"] as const;

/** Clave de un diccionario de errores por renglón (`{"1": {...}}`). */
const ROW_INDEX_KEY = /^\d+$/;

/** Antepone el renglón (base 1) al mensaje, si el mensaje salió de uno. */
const withRow = (message: string, row: number | undefined) =>
  row === undefined ? message : `Renglón ${row + 1}: ${message}`;

/**
 * Recorre un valor de error en profundidad y devuelve su primer mensaje no
 * vacío. `row` es el renglón más externo por el que se pasó (se conserva al
 * bajar más niveles).
 */
function firstMessageDeep(value: unknown, row: number | undefined): string | undefined {
  if (typeof value === "string") {
    return value.trim().length > 0 ? withRow(value, row) : undefined;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      // Un objeto dentro de una lista es un renglón; un string, un mensaje más.
      const entryRow = row ?? (entry && typeof entry === "object" && !Array.isArray(entry) ? index : undefined);
      const message = firstMessageDeep(entry, entryRow);
      if (message) return message;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      const entryRow = row ?? (ROW_INDEX_KEY.test(key) ? Number(key) : undefined);
      const message = firstMessageDeep(entry, entryRow);
      if (message) return message;
    }
  }
  return undefined;
}

/**
 * Primer mensaje de un cuerpo de error 400 de DRF, SIEMPRE un string (o
 * `undefined` si no trae ninguno), para pasarlo a un toast sin riesgo.
 *
 * A diferencia de `firstDrfFieldMessage`, que deliberadamente se queda en el
 * primer nivel, este baja a los errores anidados por renglón de un serializer
 * con `many=True`, en sus dos formas:
 * - lista alineada con los renglones, con `{}` en los válidos:
 *   `{"detalle": [{}, {"cantidad": ["msg"]}]}`
 * - diccionario por índice: `{"detalle": {"1": {"cantidad": ["msg"]}}}`
 * El mensaje de un renglón sale como "Renglón 2: msg" (base 1).
 *
 * Orden: primero los mensajes planos de primer nivel (`detail`,
 * `non_field_errors` y luego las demás claves en su orden), así que un rechazo
 * plano como `{"inventario": "Existencia insuficiente…"}` sale tal cual; solo
 * si no hay ninguno se baja a los anidados. Ignora los strings en blanco. Un
 * cuerpo que no es objeto ni lista (HTML de un 500, por ejemplo) da `undefined`.
 *
 * Existe porque el patrón `Object.values(data).flat()[0]` devolvía un OBJETO
 * con los errores anidados, y `toast.error(objeto)` tiraba toda la app
 * ("Objects are not valid as a React child", EC-898).
 */
export function firstNestedDrfMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if (Array.isArray(data)) return firstMessageDeep(data, undefined);

  const body = data as Record<string, unknown>;
  const keys = [
    ...DRF_GENERAL_KEYS.filter((key) => key in body),
    ...Object.keys(body).filter((key) => !(DRF_GENERAL_KEYS as readonly string[]).includes(key)),
  ];
  for (const key of keys) {
    const message = firstNonBlankDrfMessage(body[key]);
    if (message) return message;
  }
  return firstMessageDeep(body, undefined);
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
