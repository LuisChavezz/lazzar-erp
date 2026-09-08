import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createNotaCredito } from "../services/actions";

/** Campos de cabecera que el backend puede señalar en un `400`. */
export type NotaCreditoHeaderErrorField =
  | "factura"
  | "cliente"
  | "folio"
  | "motivo"
  | "subtotal"
  | "impuestos"
  // El techo `total <= saldo de la CxC` lo reporta el backend en ESTA llave.
  | "total"
  | "estatus"
  | "observaciones";

/**
 * Error de alta de nota de crédito, normalizado desde el contrato del backend a
 * una forma que el formulario puede pintar de tres maneras:
 *  - `formError`   → banner de "todo o nada" (detail / non_field_errors / el
 *                    error de parentesco de línea, que NO viene indexado).
 *  - `fieldErrors` → error bajo un campo de cabecera.
 *  - `lineErrors`  → error por línea, indexado por posición; la clave `_form`
 *                    guarda un error a nivel de línea no atribuible a un campo.
 * `messages` es la lista plana para el toast.
 */
export interface ParsedNotaCreditoError {
  formError?: string;
  fieldErrors: Partial<Record<NotaCreditoHeaderErrorField, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

const HEADER_FIELDS: NotaCreditoHeaderErrorField[] = [
  "factura",
  "cliente",
  "folio",
  "motivo",
  "subtotal",
  "impuestos",
  "total",
  "estatus",
  "observaciones",
];

/**
 * Normaliza el error de `POST /finanzas/notas-credito/`.
 *
 * Puerto de `parsePagoError` al contrato de notas de crédito: DRF devuelve la
 * validación del array `nota_credito_detalles` en cualquiera de cuatro formas
 * —string suelto; lista alineada por índice con `{}`/`{campo:[msg]}`; dict con
 * `non_field_errors`; dict con claves numéricas por índice— y se cubren todas
 * porque la operación es ATÓMICA (`@transaction.atomic` en `perform_create`): un
 * solo error significa que NO se creó nada — ni cabecera huérfana, ni saldo de
 * CxC tocado.
 *
 * ─── LA DIFERENCIA CON PAGOS: `factura_detalle` ───────────────────────────
 *
 * El backend valida el parentesco de cada línea en `perform_create`, FUERA del
 * serializer, y lanza `ValidationError({"factura_detalle": "..."})`. Esa llave
 * llega en la RAÍZ del cuerpo, plana y SIN índice: aunque el mensaje habla de
 * una línea concreta, el 400 no dice cuál. Atribuirlo a la línea 0 —o a
 * cualquier otra— señalaría un renglón posiblemente correcto y dejaría el
 * culpable sin marcar, así que se enruta al BANNER del formulario, con el
 * contexto de que el problema está en los conceptos. Tampoco entra en
 * `HEADER_FIELDS`: no existe ningún campo de cabecera con ese nombre donde
 * pudiera pintarse.
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de "todo o nada" siempre aparezca.
 */
export function parseNotaCreditoError(error: unknown): ParsedNotaCreditoError {
  const result: ParsedNotaCreditoError = {
    fieldErrors: {},
    lineErrors: {},
    messages: [],
  };

  const pushLineError = (index: number, field: string, message: string) => {
    if (!result.lineErrors[index]) result.lineErrors[index] = {};
    result.lineErrors[index][field] = message;
    result.messages.push(`Concepto ${index + 1}: ${message}`);
  };

  if (!(error instanceof AxiosError)) {
    result.formError = "Error al registrar la nota de crédito.";
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
  // `raise ValidationError("...")`, que es como llegan los rechazos de ciclo de
  // vida ("No se puede editar una nota de crédito cancelada.").
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = "Error al registrar la nota de crédito.";
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || "Error al registrar la nota de crédito.";
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

  // ── Parentesco de línea: plano, sin índice → nivel formulario ────────────
  // Ver la nota del docstring. Se resuelve ANTES que los campos de cabecera para
  // que su mensaje sea el que gane el banner, y nunca se enruta a una línea.
  const parentesco = firstDrfMessage(record.factura_detalle);
  if (parentesco) {
    const message = `${parentesco} Revisa los conceptos seleccionados.`;
    result.formError = message;
    result.messages.push(message);
  }

  // ── Errores de cabecera (incluye el techo del saldo en `total`) ──────────
  for (const field of HEADER_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  }

  // ── Errores del detalle (array) ──────────────────────────────────────────
  const detalles = record.nota_credito_detalles;

  if (typeof detalles === "string" && detalles.length > 0) {
    // Un solo mensaje para todo el array.
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
      if (key === "nota_credito_detalles") return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = "Error de validación al registrar la nota de crédito.";
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
 * Mutación de alta de nota de crédito. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner de "todo o
 * nada", los campos de cabecera y las líneas.
 *
 * Invalida `["credit-notes"]` (el listado) y `["accounts-receivable"]` por
 * PREFIJO: una nota EMITIDA baja el saldo de la cuenta por cobrar de su factura
 * y puede marcarla `Pagada`, así que las listas de CxC cacheadas —incluida la
 * que alimenta el selector de facturas de este mismo formulario— quedan
 * obsoletas. Se invalida también en el alta de un borrador: cuesta un refetch y
 * evita razonar sobre cuál de los dos caminos tocó saldos.
 */
export const useCreateNotaCredito = (
  onServerError?: (parsed: ParsedNotaCreditoError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNotaCredito,
    onSuccess: (nota) => {
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      toast.success(
        nota.estatus === "Emitida"
          ? "Nota de crédito emitida correctamente"
          : "Borrador de nota de crédito guardado",
      );
    },
    onError: (error) => {
      const parsed = parseNotaCreditoError(error);
      onServerError?.(parsed);

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar la nota de crédito";
      toast.error(toastMessage);
    },
  });
};
