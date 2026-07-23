import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createPicking } from "../services/actions";

/** Campos del formulario que el backend puede señalar en un `400`. */
export type PickingFormErrorField =
  | "pedido"
  | "almacen"
  | "prioridad"
  | "tipo"
  | "observaciones";

const FORM_FIELDS: PickingFormErrorField[] = [
  "pedido",
  "almacen",
  "prioridad",
  "tipo",
  "observaciones",
];

/**
 * Error de creación de picking, normalizado desde el contrato del backend.
 *
 * `operador` NO tiene campo visible en el formulario (se deriva de la sesión,
 * ver `usePickingForm`), así que un error de DRF sobre `operador` no puede
 * atribuirse a ningún input — se vuelca siempre a `formError`/`messages`, en
 * vez de a `fieldErrors`, para que el usuario al menos vea el motivo del
 * rechazo aunque no pueda corregirlo desde un campo.
 */
export interface ParsedPickingError {
  formError?: string;
  fieldErrors: Partial<Record<PickingFormErrorField, string>>;
  messages: string[];
}

/**
 * Normaliza el error de `POST /wms/pickings/`. Mismo criterio que
 * `parseStockTransferError` (traspasos), simplificado: sin `transferencia_detalle`
 * porque este endpoint no recibe líneas.
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de error siempre aparezca.
 */
export function parsePickingError(error: unknown): ParsedPickingError {
  const result: ParsedPickingError = { fieldErrors: {}, messages: [] };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar el picking.";
    return result;
  }

  const data = error.response?.data;

  // Respuesta en texto plano (ej. 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return result;
  }

  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar el picking.";
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar el picking.";
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Errores a nivel operación ────────────────────────────────────────────
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

  // `operador` no tiene campo en la UI — su error se trata como de operación.
  const operadorMessage = firstDrfMessage(record.operador);
  if (operadorMessage) {
    result.formError = result.formError ?? operadorMessage;
    result.messages.push(operadorMessage);
  }

  // ── Errores de campo (atribuibles a un input visible) ────────────────────
  for (const field of FORM_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  // Fallback: cualquier otra clave desconocida contribuye al toast.
  if (result.messages.length === 0) {
    Object.values(record).forEach((value) => {
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = "Error de validación al registrar el picking.";
    }
  }

  // Garantía final: si no hubo error de operación ni de campo pero sí un
  // mensaje suelto, se usa como motivo del banner (nunca se deja el motivo
  // real solo en el toast efímero).
  if (
    !result.formError &&
    Object.keys(result.fieldErrors).length === 0 &&
    result.messages.length > 0
  ) {
    result.formError = result.messages[0];
  }

  return result;
}

/**
 * Mutación para crear un picking. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner y los campos.
 *
 * Invalida `["pickings"]` (la lista propia del módulo, ver `usePickings`).
 */
export const useCreatePicking = (onServerError?: (parsed: ParsedPickingError) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPicking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickings"] });
      toast.success("Picking registrado correctamente");
    },
    onError: (error) => {
      const parsed = parsePickingError(error);
      onServerError?.(parsed);

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar el picking";
      toast.error(toastMessage);
    },
  });
};
