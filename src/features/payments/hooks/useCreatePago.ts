import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createPago } from "../services/actions";

/** Campos de cabecera que el backend puede señalar en un `400`. */
export type PagoHeaderErrorField =
  | "proveedor"
  | "cuenta_bancaria"
  | "fecha_pago"
  | "metodo_pago"
  | "referencia"
  | "referencia_operacion"
  | "observaciones"
  // El cuadre `|suma − total_pagado| <= 0.01` lo reporta el backend en ESTA
  // llave, no en `pago_detalles`: es un error de CABECERA aunque su causa esté
  // repartida entre las líneas.
  | "total_pagado";

/**
 * Error de alta de pago, normalizado desde el contrato del backend a una forma
 * que el formulario puede pintar de tres maneras:
 *  - `formError`   → banner de "todo o nada" (detail / non_field_errors).
 *  - `fieldErrors` → error bajo un campo de cabecera (incluido `total_pagado`).
 *  - `lineErrors`  → error por línea, indexado por posición; la clave `_form`
 *                    guarda un error a nivel de línea no atribuible a un campo.
 * `messages` es la lista plana para el toast.
 */
export interface ParsedPagoError {
  formError?: string;
  fieldErrors: Partial<Record<PagoHeaderErrorField, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

const HEADER_FIELDS: PagoHeaderErrorField[] = [
  "proveedor",
  "cuenta_bancaria",
  "fecha_pago",
  "metodo_pago",
  "referencia",
  "referencia_operacion",
  "observaciones",
  "total_pagado",
];

/**
 * Normaliza el error de `POST /finanzas/pagos/`.
 *
 * Puerto de `parseStockTransferError` (traspasos) al contrato de pagos: DRF
 * devuelve la validación del array `pago_detalles` en cualquiera de cuatro
 * formas —string suelto; lista alineada por índice con `{}`/`{campo:[msg]}`;
 * dict con `non_field_errors`; dict con claves numéricas por índice— y los
 * rechazos de regla de negocio (importe mayor al saldo, línea vacía) suelen
 * llegar por ahí. Se cubren todas porque la operación es ATÓMICA
 * (`@transaction.atomic`): un solo error significa que NO se creó nada — ni
 * cabecera huérfana, ni saldos tocados, ni movimiento bancario.
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de "todo o nada" siempre aparezca.
 */
export function parsePagoError(error: unknown): ParsedPagoError {
  const result: ParsedPagoError = {
    fieldErrors: {},
    lineErrors: {},
    messages: [],
  };

  const pushLineError = (index: number, field: string, message: string) => {
    if (!result.lineErrors[index]) result.lineErrors[index] = {};
    result.lineErrors[index][field] = message;
    result.messages.push(`Línea ${index + 1}: ${message}`);
  };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar el pago.";
    return result;
  }

  const data = error.response?.data;

  // Respuesta en texto plano (p. ej. un 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return result;
  }

  // Cuerpo de error como lista de nivel superior — la forma que produce DRF con
  // `raise ValidationError("...")`.
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar el pago.";
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar el pago.";
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Errores a nivel operación (todo o nada) ──────────────────────────────
  const detail = firstDrfMessage(record.detail);
  if (detail) {
    result.formError = detail;
    result.messages.push(detail);
  }
  const nonField = firstDrfMessage(record.non_field_errors);
  if (nonField) {
    result.formError = result.formError ?? nonField;
    result.messages.push(nonField);
  }

  // ── Errores de cabecera (incluye el cuadre en `total_pagado`) ────────────
  for (const field of HEADER_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  // ── Errores del detalle (array) ──────────────────────────────────────────
  const detalles = record.pago_detalles;

  if (typeof detalles === "string" && detalles.length > 0) {
    // Un solo mensaje para todo el array (p. ej. "Agrega al menos una línea").
    result.formError = result.formError ?? detalles;
    result.messages.push(detalles);
  } else if (Array.isArray(detalles)) {
    detalles.forEach((entry, index) => {
      if (!entry) return;
      const entryMessage = firstDrfMessage(entry);
      if (entryMessage) {
        // Elemento string o string[] → error a nivel de línea.
        pushLineError(index, "_form", entryMessage);
        return;
      }
      if (typeof entry === "object") {
        Object.entries(entry as Record<string, unknown>).forEach(
          ([lineField, lineValue]) => {
            const message = firstDrfMessage(lineValue);
            if (!message) return;
            const field = lineField === "non_field_errors" ? "_form" : lineField;
            pushLineError(index, field, message);
          },
        );
      }
    });
  } else if (detalles && typeof detalles === "object") {
    // Dict: `non_field_errors` o claves numéricas por índice.
    Object.entries(detalles as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "non_field_errors") {
        const message = firstDrfMessage(value);
        if (message) {
          result.formError = result.formError ?? message;
          result.messages.push(message);
        }
        return;
      }
      const index = Number(key);
      if (!Number.isInteger(index) || !value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(
        ([lineField, lineValue]) => {
          const message = firstDrfMessage(lineValue);
          if (!message) return;
          const field = lineField === "non_field_errors" ? "_form" : lineField;
          pushLineError(index, field, message);
        },
      );
    });
  }

  // Fallback: cualquier otra clave desconocida contribuye al toast.
  if (result.messages.length === 0) {
    Object.entries(record).forEach(([key, value]) => {
      if (key === "pago_detalles") return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = "Error de validación al registrar el pago.";
    }
  }

  // Garantía final: si no hubo error de operación ni de campo/línea pero sí un
  // mensaje suelto, se usa como motivo del banner persistente (nunca se deja el
  // motivo real solo en el toast efímero).
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

/**
 * Mutación de alta de pago. `onServerError` recibe el error ya normalizado para
 * que el formulario lo reparta entre el banner de "todo o nada", los campos de
 * cabecera y las líneas.
 *
 * Invalida `["pagos"]` (el listado) y `["cuentas-por-pagar"]` por PREFIJO: al
 * aplicarse, el pago baja el saldo de cada CxP y puede marcarlas `Pagada`, así
 * que las listas por proveedor que el selector haya cacheado quedan obsoletas.
 */
export const useCreatePago = (
  onServerError?: (parsed: ParsedPagoError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPago,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] });
      toast.success("Pago registrado correctamente");
    },
    onError: (error) => {
      const parsed = parsePagoError(error);
      onServerError?.(parsed);

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el pago";
      toast.error(toastMessage);
    },
  });
};
