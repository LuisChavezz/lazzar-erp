import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/** Campos del formulario de alta que el backend puede señalar en un `400`. */
export type CuentaPorPagarErrorField =
  | "proveedor"
  | "factura_proveedor"
  | "total"
  | "fecha_vencimiento"
  | "observaciones";

/**
 * Qué CLASE de fallo fue. Decide la afordancia de la UI, no solo el texto:
 *  - `validation` → 400: validación o regla de negocio (total/proveedor que no
 *    cuadran con la factura, factura duplicada, borrar una CxP con pagos
 *    aplicados). Repetir la misma petición daría el mismo 400: el usuario tiene
 *    que corregir algo —o, en el borrado, cancelar antes los pagos—.
 *  - `conflict`   → 409: otra transacción tenía bloqueadas las filas (el guard
 *    NOWAIT del borrado) o Postgres abortó un deadlock. No hay nada que
 *    corregir: la MISMA petición puede tener éxito al reintentarla. Todo viewset
 *    de finanzas traduce los choques de concurrencia a 409, así que también
 *    puede llegar en el alta, no solo en el borrado.
 *  - `unexpected` → cualquier otra cosa (red, 403, 404, 500).
 */
export type CuentaPorPagarErrorKind = "validation" | "conflict" | "unexpected";

/**
 * Error de una operación de CxP, normalizado desde el contrato del backend:
 *  - `kind`        → ver `CuentaPorPagarErrorKind`.
 *  - `formError`   → banner de "todo o nada" (lista de nivel superior, `detail`,
 *                    `non_field_errors`, el 409 y cualquier llave que no sea
 *                    campo del formulario).
 *  - `fieldErrors` → error bajo un campo del formulario de alta.
 * `messages` es la lista plana para el toast.
 *
 * Sin `lineErrors`: a diferencia de pagos o notas de crédito, la CxP es un
 * documento de solo cabecera.
 */
export interface ParsedCuentaPorPagarError {
  kind: CuentaPorPagarErrorKind;
  formError?: string;
  fieldErrors: Partial<Record<CuentaPorPagarErrorField, string>>;
  messages: string[];
}

const FORM_FIELDS: ReadonlySet<string> = new Set<CuentaPorPagarErrorField>([
  "proveedor",
  "factura_proveedor",
  "total",
  "fecha_vencimiento",
  "observaciones",
]);

/** Llaves que hablan de la operación completa, no de un campo. */
const OPERATION_KEYS = ["detail", "non_field_errors"] as const;

/**
 * Motivo de respaldo de un 409 sin mensaje legible. El backend siempre manda
 * uno, pero la afordancia de reintento no debe depender de que llegue.
 */
export const CXP_CONFLICT_FALLBACK_MESSAGE =
  "Otra operación está modificando esta cuenta por pagar. Intenta de nuevo.";

const isFormField = (key: string): key is CuentaPorPagarErrorField =>
  FORM_FIELDS.has(key);

/**
 * Normaliza el error de las operaciones de cuenta por pagar (alta y borrado).
 *
 * Puerto de `parsePagoError` (pagos) sin la parte de líneas. NO usa
 * `extractErrorMessage`: esa función solo lee `{ error: string }` y no
 * desenvuelve las formas de DRF en que llegan estos rechazos —
 * `{"total": ["El total (…) no coincide…"]}` en el alta, o la lista de nivel
 * superior `["No se puede eliminar una cuenta por pagar con pagos aplicados…"]`
 * del borrado—, así que dejaría al usuario con "Request failed with status code
 * 400" en vez del motivo real.
 *
 * Dos diferencias deliberadas con `parsePagoError`:
 *  - `fallback` es parámetro (como en `parsePolizaError`): el mismo parser sirve
 *    al alta y al borrado, y un genérico redactado para el alta no describe un
 *    borrado.
 *  - Una llave desconocida (p. ej. `empresa`, `saldo`, `estatus`) va al BANNER
 *    aunque haya también errores de campo. `parsePagoError` solo la usaba cuando
 *    no había ningún otro mensaje, y la dejaba en el toast efímero.
 *
 * Un 409 nunca se reparte en campos: no es un problema de ningún valor
 * capturado.
 *
 * Siempre devuelve un objeto (nunca `null`) con `formError` o algún
 * `fieldErrors`, para que la UI siempre tenga dónde pintar el motivo.
 */
export function parseCuentaPorPagarError(
  error: unknown,
  fallback = "Error al registrar la cuenta por pagar.",
): ParsedCuentaPorPagarError {
  const result: ParsedCuentaPorPagarError = {
    kind: "unexpected",
    fieldErrors: {},
    messages: [],
  };

  const pushFormError = (message: string) => {
    result.formError = result.formError ?? message;
    result.messages.push(message);
  };

  if (!(error instanceof AxiosError)) {
    result.formError = fallback;
    return result;
  }

  const status = error.response?.status;
  if (status === 409) result.kind = "conflict";
  else if (status === 400) result.kind = "validation";

  const genericMessage =
    result.kind === "conflict" ? CXP_CONFLICT_FALLBACK_MESSAGE : fallback;

  const data = error.response?.data;

  // Respuesta en texto plano (p. ej. un 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    pushFormError(data);
    return result;
  }

  // Cuerpo de error como lista de nivel superior — la forma que produce DRF con
  // `raise ValidationError("...")` y la del 409 de concurrencia. Es como llegan
  // los guards del borrado.
  if (Array.isArray(data)) {
    data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message))
      .forEach(pushFormError);
    if (!result.formError) result.formError = genericMessage;
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError =
      result.kind === "conflict" ? genericMessage : error.message || fallback;
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Errores a nivel operación (todo o nada) ──────────────────────────────
  // Primero, para que su mensaje sea el que gane el banner.
  for (const key of OPERATION_KEYS) {
    const message = firstDrfMessage(record[key]);
    if (message) pushFormError(message);
  }

  // ── Errores por llave ────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(record)) {
    if ((OPERATION_KEYS as readonly string[]).includes(key)) continue;
    const message = firstDrfMessage(value);
    if (!message) continue;

    if (result.kind !== "conflict" && isFormField(key)) {
      result.fieldErrors[key] = message;
      result.messages.push(message);
    } else {
      pushFormError(message);
    }
  }

  // Nada legible en el cuerpo: el banner nunca se queda vacío.
  if (result.messages.length === 0) {
    result.formError = genericMessage;
  }

  return result;
}
