import { isAxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { isWholeArrayDrfError } from "@/src/utils/isWholeArrayDrfError";

/**
 * Error de alta de un documento con LÍNEAS (pago, cobro…), normalizado para que
 * el formulario lo pinte de tres maneras:
 *  - `formError`   → banner de "todo o nada" (la operación es atómica);
 *  - `fieldErrors` → bajo un campo de cabecera (incluido el total derivado);
 *  - `lineErrors`  → por línea, indexado por posición; `_form` guarda un error
 *                    de línea no atribuible a un campo.
 * `messages` es la lista plana para el toast.
 */
export interface ParsedLineItemsError<H extends string> {
  formError?: string;
  fieldErrors: Partial<Record<H, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

export interface LineItemsErrorConfig<H extends string> {
  /** Llave del arreglo de líneas en el cuerpo (`pago_detalles`, `cobro_detalles`). */
  linesKey: string;
  /** Campos de cabecera que el backend puede señalar. */
  headerFields: readonly H[];
  /**
   * Llaves que no son de ningún campo y van al banner. Por defecto `detail` y
   * `non_field_errors`.
   */
  formLevelKeys?: readonly string[];
  /** Banner ante un error inesperado ("Error al registrar el pago."). */
  genericMessage: string;
  /** Banner de un 400 sin mensajes legibles ("Error de validación al registrar el pago."). */
  validationMessage: string;
  /**
   * `true`: una lista de líneas hecha SOLO de strings habla del documento entero
   * (`ErrorDeNegocio({"<líneas>": "..."})`), no de su primera línea — ver
   * `isWholeArrayDrfError`. `false` (por defecto): cada string es el error de la
   * línea en su posición.
   */
  wholeArrayStringsAreUnindexed?: boolean;
  /**
   * Para un mensaje de líneas SIN índice: la línea de la que habla (p. ej. por
   * el id de su CxC en el texto), o `-1` si no se puede saber (va al banner).
   */
  resolveUnindexedLine?: (message: string) => number;
}

const DEFAULT_FORM_LEVEL_KEYS = ["detail", "non_field_errors"] as const;

/**
 * Normaliza el error de un `POST` con líneas anidadas. DRF devuelve el arreglo
 * de líneas en cuatro formas —string suelto; lista alineada por índice con
 * `{}`/`{campo:[msg]}`/strings; dict con `non_field_errors`; dict con claves
 * numéricas— y cada valor puede llegar como `string` o `string[]`. Una lista de
 * nivel superior (`raise ValidationError("...")`, un 409 de bloqueos) va al
 * banner.
 *
 * Siempre devuelve un objeto: ante un error inesperado deja `genericMessage`.
 */
export function parseLineItemsDrfError<H extends string>(
  error: unknown,
  config: LineItemsErrorConfig<H>,
): ParsedLineItemsError<H> {
  const {
    linesKey,
    headerFields,
    formLevelKeys = DEFAULT_FORM_LEVEL_KEYS,
    genericMessage,
    validationMessage,
    wholeArrayStringsAreUnindexed = false,
    resolveUnindexedLine,
  } = config;
  const result: ParsedLineItemsError<H> = { fieldErrors: {}, lineErrors: {}, messages: [] };

  const pushLineError = (index: number, field: string, message: string) => {
    if (!result.lineErrors[index]) result.lineErrors[index] = {};
    result.lineErrors[index][field] = message;
    result.messages.push(`Línea ${index + 1}: ${message}`);
  };

  const pushFormMessage = (message: string) => {
    result.formError = result.formError ?? message;
    result.messages.push(message);
  };

  const pushUnindexedLineMessage = (message: string) => {
    const index = resolveUnindexedLine?.(message) ?? -1;
    if (index >= 0) pushLineError(index, "_form", message);
    else pushFormMessage(message);
  };

  const pushLineFields = (index: number, entry: Record<string, unknown>) => {
    Object.entries(entry).forEach(([lineField, lineValue]) => {
      const message = firstDrfMessage(lineValue);
      if (message) pushLineError(index, lineField === "non_field_errors" ? "_form" : lineField, message);
    });
  };

  if (!isAxiosError(error)) {
    result.formError = genericMessage;
    return result;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim().length > 0) {
    pushFormMessage(data);
    return result;
  }

  if (Array.isArray(data)) {
    data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message))
      .forEach(pushFormMessage);
    if (!result.formError) result.formError = genericMessage;
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || genericMessage;
    return result;
  }

  const record = data as Record<string, unknown>;

  for (const key of formLevelKeys) {
    const message = firstDrfMessage(record[key]);
    if (message) pushFormMessage(message);
  }

  for (const field of headerFields) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  const lines = record[linesKey];
  if (typeof lines === "string" && lines.length > 0) {
    pushUnindexedLineMessage(lines);
  } else if (Array.isArray(lines)) {
    if (wholeArrayStringsAreUnindexed && isWholeArrayDrfError(lines)) {
      lines
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
        .forEach(pushUnindexedLineMessage);
    } else {
      lines.forEach((entry, index) => {
        if (!entry) return;
        // Elemento string o string[] → error a nivel de línea.
        const entryMessage = firstDrfMessage(entry);
        if (entryMessage) {
          pushLineError(index, "_form", entryMessage);
        } else if (typeof entry === "object") {
          pushLineFields(index, entry as Record<string, unknown>);
        }
      });
    }
  } else if (lines && typeof lines === "object") {
    // Dict: `non_field_errors` o claves numéricas por índice.
    Object.entries(lines as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "non_field_errors") {
        const message = firstDrfMessage(value);
        if (message) pushFormMessage(message);
        return;
      }
      const index = Number(key);
      if (Number.isInteger(index) && value && typeof value === "object") {
        pushLineFields(index, value as Record<string, unknown>);
      }
    });
  }

  // Cualquier otra llave: al toast y, si no hubo nada más, al banner.
  if (result.messages.length === 0) {
    Object.entries(record).forEach(([key, value]) => {
      if (key === linesKey) return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
  }
  if (
    !result.formError &&
    Object.keys(result.fieldErrors).length === 0 &&
    Object.keys(result.lineErrors).length === 0
  ) {
    result.formError = result.messages[0] ?? validationMessage;
  }

  return result;
}
