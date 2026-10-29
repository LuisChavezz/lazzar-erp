import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createNotaCredito } from "../services/actions";
import type { CreateNotaCreditoPayload } from "../interfaces/credit-note.interface";
import {
  CREDIT_NOTE_CREATE_UNCONFIRMED_MESSAGE,
  creditNoteStampFailedMessage,
  isUnconfirmedFailure,
} from "../utils/creditNoteErrors";
import { invalidateCreditNoteQueries } from "./invalidateCreditNoteQueries";
import { getInvoiceEmitBlockReason } from "../utils/creditNoteStamping";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { fetchFreshRelatedInvoice } from "./fetchFreshRelatedInvoice";

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
 *  - `formError`   → banner del formulario (`cfdi` / detail / non_field_errors /
 *                    el error de parentesco de línea, que NO viene indexado).
 *  - `fieldErrors` → error bajo un campo de cabecera.
 *  - `lineErrors`  → error por línea, indexado por posición; la clave `_form`
 *                    guarda un error a nivel de línea no atribuible a un campo.
 * `messages` es la lista plana para el toast.
 * `unconfirmed`: el backend no confirmó el resultado (sin respuesta o 5xx; ver
 * `isUnconfirmedFailure`). NO se puede afirmar que no se guardó nada.
 * `stampFailed`: el `400` trae `cfdi`, el timbrado falló. Emitir guarda y aplica
 * la nota ANTES de timbrarla, así que tampoco se puede afirmar que no se guardó
 * nada; `formError` es entonces el motivo del backend, sin más.
 * `conflict`: `409` de concurrencia. Puede salir del timbrado, que bloquea la
 * nota DESPUÉS de guardarla, así que en una emisión tampoco prueba nada.
 */
export interface ParsedNotaCreditoError {
  formError?: string;
  unconfirmed?: boolean;
  stampFailed?: boolean;
  conflict?: boolean;
  fieldErrors: Partial<Record<NotaCreditoHeaderErrorField, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

const UNCONFIRMED_MESSAGE =
  "No se pudo confirmar el resultado: el servidor no respondió a tiempo. Revisa el listado antes de reintentar; si la nota iba a emitirse, pudo emitirse y timbrarse.";

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
 * porque el guardado es ATÓMICO (`transaction.atomic` en `perform_create`): un
 * error de validación significa que NO se creó nada — ni cabecera huérfana, ni
 * saldo de CxC tocado. La excepción es `cfdi`: el timbrado de una nota `Emitida`
 * corre DESPUÉS de ese guardado, así que su fallo llega con la nota ya escrita
 * (`stampFailed`).
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
 * `formError` genérico para que el banner siempre aparezca.
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

  // Sin respuesta o 5xx: el cuerpo (si lo hay) no es del backend —p. ej. la
  // página de error de la plataforma— y nunca se muestra. Emitir guarda la nota
  // y luego timbra, así que tampoco se puede decir que no se guardó nada.
  if (isUnconfirmedFailure(error)) {
    result.unconfirmed = true;
    result.formError = UNCONFIRMED_MESSAGE;
    result.messages.push(UNCONFIRMED_MESSAGE);
    return result;
  }

  result.conflict = error.response?.status === 409;
  const data = error.response?.data;

  // Respuesta 4xx en texto plano.
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

  // ── Errores a nivel operación ────────────────────────────────────────────
  // Todos menos `cfdi` son "todo o nada": nada quedó guardado. `cfdi` llega
  // DESPUÉS de guardar la nota (`stampFailed`).
  // `cfdi` primero: al emitir (y en `timbrar/`), el motivo del rechazo de
  // Facturama o de los datos fiscales llega en esa llave. Se muestra tal cual,
  // sin interpretar su texto: el mismo `cfdi` cubre resultados distintos (nota
  // cancelada, emitida sin CFDI, timbrado pendiente) y el texto no es contrato.
  // Le sigue `estatus` (campo de cabecera, más abajo) y luego el resto.
  const cfdi = firstDrfMessage(record.cfdi);
  if (cfdi) {
    result.stampFailed = true;
    result.formError = cfdi;
    result.messages.push(cfdi);
  }
  const detail = firstDrfMessage(record.detail);
  if (detail) {
    result.formError = result.formError ?? detail;
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

  // Junto a `cfdi` el backend puede mandar otras llaves (p. ej. `tipo_cambio`,
  // EC-592) que ningún bloque de arriba lee: se suman al motivo en vez de
  // perderse, porque con `cfdi` ya hay mensajes y el fallback no correría.
  if (result.stampFailed) {
    const leidas = new Set<string>([
      "cfdi",
      "detail",
      "non_field_errors",
      "factura_detalle",
      "nota_credito_detalles",
      ...HEADER_FIELDS,
    ]);
    Object.entries(record).forEach(([key, value]) => {
      if (leidas.has(key)) return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
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
 * Motivo de un fallo del timbrado: el `cfdi` (siempre el primero en `messages`)
 * seguido de cualquier otra llave que el backend mande junto a él (p. ej.
 * `tipo_cambio`, EC-592), para no descartarla en silencio.
 */
export const stampFailureDetail = (parsed: ParsedNotaCreditoError): string =>
  parsed.messages.length > 0 ? parsed.messages.join(" ") : (parsed.formError ?? "");

/**
 * Aviso para un alta cuya nota PUDO quedar registrada, o `null` si el error
 * prueba que no se guardó nada. Un `cfdi` siempre (el timbrado corre después
 * de guardar). Sin confirmación (sin respuesta, timeout, 5xx) o un `409`, solo
 * en un alta `Emitida`: esos fallos pueden ocurrir ya guardada y aplicada la
 * nota, mientras que un borrador repetido no mueve ningún saldo.
 */
export const getCreateMayBeSavedMessage = (
  parsed: ParsedNotaCreditoError,
  estatus: CreateNotaCreditoPayload["estatus"],
): string | null => {
  if (parsed.stampFailed) {
    return creditNoteStampFailedMessage("alta", stampFailureDetail(parsed));
  }
  if (estatus === "Emitida" && (parsed.unconfirmed || parsed.conflict)) {
    return CREDIT_NOTE_CREATE_UNCONFIRMED_MESSAGE;
  }
  return null;
};

/**
 * Mutación de alta de nota de crédito. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner, los campos de
 * cabecera y las líneas, junto con el aviso de `getCreateMayBeSavedMessage`
 * cuando la nota pudo quedar registrada.
 *
 * Refresca en `onSettled` (`invalidateCreditNoteQueries`) según lo enviado: una
 * nota EMITIDA baja el saldo de la cuenta por cobrar de su factura y puede
 * marcarla `Pagada`, así que con ella se refrescan también la CxC —incluida la
 * lista que alimenta el selector de facturas de este formulario—, la factura y
 * el pedido (`balances`); un borrador solo cambia las notas de la factura
 * (`document`).
 *
 * Un alta `Emitida` pide antes la factura FRESCA y se detiene con
 * `PrecheckError`, sin POST, si ya no admite notas —incluido un `404`— o tiene
 * su timbrado sin confirmar (`getInvoiceEmitBlockReason`): pudo cambiar después
 * de elegirla en el selector. El precheck se
 * reporta como un error de validación (nada se registró). Un borrador no lo
 * necesita: no mueve saldos ni timbra.
 */
export const useCreateNotaCredito = (
  onServerError?: (
    parsed: ParsedNotaCreditoError,
    mayBeSavedMessage: string | null,
  ) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNotaCreditoPayload) => {
      if (payload.estatus === "Emitida") {
        const factura = await fetchFreshRelatedInvoice(queryClient, payload.factura);
        const blockReason = getInvoiceEmitBlockReason(factura?.folio ?? null, factura);
        if (blockReason) throw new PrecheckError(blockReason);
      }
      return createNotaCredito(payload);
    },
    onSuccess: (nota) => {
      toast.success(
        nota.estatus === "Emitida"
          ? "Nota de crédito emitida correctamente"
          : "Borrador de nota de crédito guardado",
      );
    },
    onError: (error, payload) => {
      if (error instanceof PrecheckError) {
        onServerError?.(
          { formError: error.message, fieldErrors: {}, lineErrors: {}, messages: [error.message] },
          null,
        );
        toast.error(error.message);
        return;
      }
      const parsed = parseNotaCreditoError(error);
      const mayBeSavedMessage = getCreateMayBeSavedMessage(parsed, payload.estatus);
      onServerError?.(parsed, mayBeSavedMessage);

      const toastMessage = mayBeSavedMessage
        ? mayBeSavedMessage
        : parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al registrar la nota de crédito";
      toast.error(toastMessage);
    },
    // También ante un error: un alta emitida guarda la nota antes de timbrarla,
    // así que un fallo del timbrado (o un timeout) pudo dejarla en el listado.
    onSettled: (_nota, _error, payload) =>
      invalidateCreditNoteQueries(
        queryClient,
        payload.estatus === "Emitida" ? "balances" : "document",
      ),
  });
};
