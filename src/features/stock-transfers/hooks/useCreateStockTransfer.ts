import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createTransferencia } from "../services/actions";

/** Campos de cabecera que el backend puede señalar en un `400`. */
export type TransferHeaderErrorField =
  | "almacen_origen"
  | "almacen_destino"
  | "observaciones";

/**
 * Error de creación de traspaso, normalizado desde el contrato del backend a
 * una forma que el formulario puede pintar de tres maneras:
 *  - `formError`   → banner de "todo o nada" (detail / non_field_errors / stock).
 *  - `fieldErrors` → error bajo un campo de cabecera.
 *  - `lineErrors`  → error por línea, indexado por posición; la clave `_form`
 *                    guarda un error a nivel de línea (no atribuible a un campo).
 * `messages` es la lista plana para el toast.
 */
export interface ParsedTransferError {
  formError?: string;
  fieldErrors: Partial<Record<TransferHeaderErrorField, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

const HEADER_FIELDS: TransferHeaderErrorField[] = [
  "almacen_origen",
  "almacen_destino",
  "observaciones",
];

/**
 * Normaliza el error de `POST /wms/transferencias/`.
 *
 * DRF puede devolver la validación del array `transferencia_detalle` de varias
 * formas (string; lista alineada por índice con `{}`/`{campo:[msg]}`; dict con
 * `non_field_errors`), y el rechazo por stock insuficiente suele llegar como
 * `detail`/`non_field_errors`. Se cubren todos porque la operación es atómica:
 * un solo error significa que NADA se creó (no hay éxito parcial).
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de "todo o nada" siempre aparezca.
 */
export function parseStockTransferError(error: unknown): ParsedTransferError {
  const result: ParsedTransferError = {
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
    result.formError = "Error al registrar el traspaso.";
    return result;
  }

  const data = error.response?.data;

  // Respuesta en texto plano (ej. 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return result;
  }

  // Cuerpo de error como lista de nivel superior — la forma que produce DRF con
  // `raise ValidationError("...")` (ej. el rechazo por stock insuficiente, que
  // es EL motivo de la atomicidad). Debe quedar en el banner persistente, no
  // solo en el toast efímero.
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar el traspaso.";
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError =
      error.message || "Error al registrar el traspaso.";
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

  // ── Errores de cabecera ──────────────────────────────────────────────────
  for (const field of HEADER_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  // ── Errores del detalle (array) ──────────────────────────────────────────
  const detalle = record.transferencia_detalle;

  if (typeof detalle === "string" && detalle.length > 0) {
    // Un solo mensaje para todo el array.
    result.formError = result.formError ?? detalle;
    result.messages.push(detalle);
  } else if (Array.isArray(detalle)) {
    detalle.forEach((entry, index) => {
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
            const field =
              lineField === "non_field_errors" ? "_form" : lineField;
            pushLineError(index, field, message);
          },
        );
      }
    });
  } else if (detalle && typeof detalle === "object") {
    // Dict: `non_field_errors` o claves numéricas por índice.
    Object.entries(detalle as Record<string, unknown>).forEach(([key, value]) => {
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
      if (key === "transferencia_detalle") return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = "Error de validación al registrar el traspaso.";
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
 * Mutación para crear un traspaso. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner de "todo o
 * nada", los campos de cabecera y las líneas.
 *
 * No hay `GET /wms/transferencias/` todavía, así que no hay lista propia que
 * invalidar; se invalida la query general de movimientos (`["stockMovements"]`)
 * para que el `MovimientoInventario` resultante aparezca en el historial
 * general si el usuario navega ahí después.
 */
export const useCreateStockTransfer = (
  onServerError?: (parsed: ParsedTransferError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransferencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      toast.success("Traspaso registrado correctamente");
    },
    onError: (error) => {
      const parsed = parseStockTransferError(error);
      onServerError?.(parsed);

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el traspaso";
      toast.error(toastMessage);
    },
  });
};
