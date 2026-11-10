import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { isWholeArrayDrfError } from "@/src/utils/isWholeArrayDrfError";

/**
 * Campos que el formulario puede marcar con un error del backend. Incluye los
 * DERIVADOS de la OC (`proveedor`, `moneda`, `sucursal`): no son inputs, pero la
 * vista los pinta en la sección de la orden de compra, que es lo que los decide.
 */
export type SupplierInvoiceFieldErrorKey =
  | "oc"
  | "recepcion"
  | "proveedor"
  | "moneda"
  | "sucursal"
  | "folio"
  | "fecha_vencimiento"
  | "observaciones";

/**
 * Error de factura de proveedor, normalizado desde el contrato del backend:
 *  - `formError`   → banner de "todo o nada" (detail / non_field_errors / las
 *                    llaves planas que hablan de un renglón sin decir cuál / los
 *                    importes de cabecera, que no son inputs).
 *  - `fieldErrors` → error bajo un campo o sección de cabecera.
 *  - `lineErrors`  → error por renglón, indexado por posición; `_form` guarda un
 *                    error de renglón no atribuible a un input.
 * `messages` es la lista plana para el toast.
 */
export interface ParsedSupplierInvoiceError {
  formError?: string;
  fieldErrors: Partial<Record<SupplierInvoiceFieldErrorKey, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

const FIELD_KEYS: SupplierInvoiceFieldErrorKey[] = [
  "oc",
  "recepcion",
  "proveedor",
  "moneda",
  "sucursal",
  "folio",
  "fecha_vencimiento",
  "observaciones",
];

/**
 * Campos de renglón que SÍ son inputs en la vista. `subtotal`, `impuesto` y
 * `total` del renglón se derivan: un error sobre ellos no tiene input donde
 * pintarse y se enruta al `_form` de ese renglón.
 */
const LINE_INPUT_FIELDS = new Set(["cantidad", "precio_unitario", "descuento"]);

/**
 * Llaves PLANAS de la raíz del cuerpo que hablan de un renglón sin decir cuál.
 * `perform_create` valida el parentesco de cada renglón FUERA del serializer y
 * lanza `ValidationError({"oc_detalle": [...]})`, `({"recepcion_detalle": [...]})`
 * o `({"producto": [...]})`: el 400 no trae índice, así que atribuirlo a un
 * renglón concreto señalaría uno posiblemente correcto. Van al banner. Mismo
 * criterio que `cuenta_contable` en `parsePolizaError`.
 */
const FLAT_LINE_KEYS: Record<string, string> = {
  oc_detalle: "Revisa que las partidas correspondan a la orden de compra.",
  recepcion_detalle: "Revisa que las partidas correspondan a la recepción.",
  producto: "Revisa el producto de las partidas.",
};

/**
 * Qué hacer con un error de un campo que el usuario NO edita directamente. La
 * `sucursal` se deriva de la OC y no es un input: el backend la rechaza si no es
 * la de la OC y la de la recepción (nucleo-erp #813, `"Debe ser la sucursal de
 * la orden de compra|recepción."`). Si la recepción es de otra sucursal que su
 * OC (recepciones viejas), ningún cambio en el formulario lo corrige: hay que
 * elegir otra OC o recepción.
 *
 * Solo aplica a ESE rechazo, reconocido por su texto (`serializers.py`,
 * `_validar_sucursal_del_documento`): el otro error de `sucursal`, "Sucursal no
 * pertenece a la empresa.", es un problema de empresa que otra OC no arregla.
 */
const FIELD_HINTS: Partial<
  Record<SupplierInvoiceFieldErrorKey, { applies: RegExp; hint: string }>
> = {
  sucursal: {
    applies: /^Debe ser la sucursal de la (orden de compra|recepción).?$/,
    hint: "La sucursal de la factura sale de la orden de compra y no se puede cambiar: elige otra orden de compra o recepción de la misma sucursal.",
  },
};

/**
 * Llaves de raíz sin campo en pantalla: se pintan en el banner.
 *  - `empresa`: nadie la escribe (desde EC-798 la resuelve el servidor,
 *    superusuario incluido); llega, p. ej., si el usuario no tiene empresa.
 *  - `estatus`: rechazos de ciclo de vida.
 *  - `factura_proveedor`: reglas de `CuentaPorPagarService` al generar/revivir la
 *    CxP (p. ej. una CxP cancelada con pagos aplicados).
 *  - `subtotal`/`descuento`/`impuestos`/`total`: DERIVADOS de los renglones; el
 *    backend no los valida hoy, pero si algún día lo hace no hay input donde
 *    mostrarlo.
 */
const BANNER_KEYS = [
  "empresa",
  "estatus",
  "factura_proveedor",
  "subtotal",
  "descuento",
  "impuestos",
  "total",
] as const;

/**
 * Normaliza el error de las operaciones de factura de proveedor (alta y PATCH).
 *
 * Puerto de `parsePolizaError`. El cuerpo de error de este módulo NO es uniforme:
 * `serializer.validate()` y los renglones llegan como listas
 * (`{"campo": ["msg"]}`), pero `serializer.validate()` también lanza strings
 * sueltos (`{"recepcion": "Recepción no corresponde a la OC."}`) y
 * `_validate_fk_empresa` en `perform_create` hace lo mismo. `firstDrfMessage`
 * acepta `string | string[]`, así que ambas formas se desenvuelven con la misma
 * llamada — por eso aquí no se usa `extractErrorMessage`, que solo lee
 * `{ error: string }`.
 *
 * Siempre devuelve un objeto: ante un error inesperado deja un `formError`
 * genérico para que el banner siempre aparezca.
 */
export function parseSupplierInvoiceError(
  error: unknown,
  fallback = "Error al guardar la factura de proveedor.",
): ParsedSupplierInvoiceError {
  const result: ParsedSupplierInvoiceError = {
    fieldErrors: {},
    lineErrors: {},
    messages: [],
  };

  const pushLineError = (index: number, field: string, message: string) => {
    const target = LINE_INPUT_FIELDS.has(field) ? field : "_form";
    if (!result.lineErrors[index]) result.lineErrors[index] = {};
    // Si varios campos derivados caen en `_form`, se conserva el primero.
    if (!result.lineErrors[index][target]) result.lineErrors[index][target] = message;
    result.messages.push(`Partida ${index + 1}: ${message}`);
  };

  const pushFormError = (message: string) => {
    result.formError = result.formError ?? message;
    result.messages.push(message);
  };

  if (!(error instanceof AxiosError)) {
    result.formError = fallback;
    return result;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return result;
  }

  // Lista de nivel superior — `raise ValidationError("...")`.
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = fallback;
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || fallback;
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Operación completa ───────────────────────────────────────────────────
  const detail = firstDrfMessage(record.detail);
  if (detail) pushFormError(detail);
  const nonField = firstDrfMessage(record.non_field_errors);
  if (nonField) pushFormError(nonField);

  // ── Parentesco de renglón: plano, sin índice → banner ────────────────────
  for (const [key, hint] of Object.entries(FLAT_LINE_KEYS)) {
    const message = firstDrfMessage(record[key]);
    if (message) pushFormError(`${message} ${hint}`);
  }

  for (const key of BANNER_KEYS) {
    const message = firstDrfMessage(record[key]);
    if (message) pushFormError(message);
  }

  // ── Campos de cabecera ───────────────────────────────────────────────────
  for (const field of FIELD_KEYS) {
    const raw = firstDrfMessage(record[field]);
    if (raw) {
      const hint = FIELD_HINTS[field];
      const message = hint?.applies.test(raw.trim()) ? `${raw} ${hint.hint}` : raw;
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  // ── Renglones (array) ────────────────────────────────────────────────────
  const detalles = record.factura_proveedor_detalles;

  if (typeof detalles === "string" && detalles.length > 0) {
    pushFormError(detalles);
  } else if (Array.isArray(detalles)) {
    if (isWholeArrayDrfError(detalles)) {
      detalles.forEach((entry) => {
        const message = firstDrfMessage(entry);
        if (message) pushFormError(message);
      });
    } else {
      detalles.forEach((entry, index) => {
        if (!entry) return;
        const entryMessage = firstDrfMessage(entry);
        if (entryMessage) {
          pushLineError(index, "_form", entryMessage);
          return;
        }
        if (typeof entry === "object") {
          Object.entries(entry as Record<string, unknown>).forEach(
            ([lineField, lineValue]) => {
              const message = firstDrfMessage(lineValue);
              if (!message) return;
              pushLineError(
                index,
                lineField === "non_field_errors" ? "_form" : lineField,
                message,
              );
            },
          );
        }
      });
    }
  } else if (detalles && typeof detalles === "object") {
    Object.entries(detalles as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "non_field_errors") {
        const message = firstDrfMessage(value);
        if (message) pushFormError(message);
        return;
      }
      const index = Number(key);
      if (!Number.isInteger(index) || !value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(
        ([lineField, lineValue]) => {
          const message = firstDrfMessage(lineValue);
          if (!message) return;
          pushLineError(
            index,
            lineField === "non_field_errors" ? "_form" : lineField,
            message,
          );
        },
      );
    });
  }

  // Fallback: llaves desconocidas contribuyen al toast y al banner.
  if (result.messages.length === 0) {
    Object.entries(record).forEach(([key, value]) => {
      if (key === "factura_proveedor_detalles") return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = `Error de validación. ${fallback}`;
    }
  }

  if (
    !result.formError &&
    Object.keys(result.fieldErrors).length === 0 &&
    Object.keys(result.lineErrors).length === 0 &&
    result.messages.length > 0
  ) {
    result.formError = result.messages[0];
  }

  return result;
}

/** Texto para el toast, a partir del error ya normalizado. */
export const supplierInvoiceErrorToastMessage = (
  parsed: ParsedSupplierInvoiceError,
  fallback: string,
): string =>
  parsed.messages.length > 0 ? parsed.messages.join("\n") : parsed.formError ?? fallback;
