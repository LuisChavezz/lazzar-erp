import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { emitirNotaCredito } from "../services/actions";
import {
  parseNotaCreditoError,
  freshlyReadNotaId,
  readEmittedNota,
  stampFailureDetail,
  type ParsedNotaCreditoError,
} from "./useCreateNotaCredito";
import { invalidateCreditNoteQueries } from "./invalidateCreditNoteQueries";
import {
  CREDIT_NOTE_EMIT_UNCONFIRMED_MESSAGE,
  creditNoteEmitCancelledMessage,
  creditNoteEmitRevertedDetail,
  creditNoteEmitRevertedMessage,
  creditNoteRevertCause,
  creditNoteStampFailedMessage,
  describeEmittedNotaCredito,
  type EmittedNotaCreditoState,
  logUnexpectedError,
  STAMP_FAILED_TOAST_DURATION_MS,
  type StampFailedNota,
} from "../utils/creditNoteErrors";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { fetchFreshInvoice } from "@/src/features/invoicing/hooks/invoiceActionMutation";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";
import { getInvoiceEmitPrecheckReason } from "../utils/creditNoteStamping";
import { fetchFreshNotaCredito } from "./fetchFreshNotaCredito";

/** Qué nota se emite: su id y cómo nombrarla en los avisos (folio o `#id`). */
export interface EmitirNotaCreditoVariables {
  id: number;
  label: string;
}

/**
 * La nota que el `400` de la emisión reporta (`nota_credito`, con `cfdi` o con
 * otra llave: nucleo-erp #848), solo si es ESTA nota. Un `nota_credito` de otra
 * nota, o sin él, no dice nada de esta.
 */
const reportedNota = (
  parsed: ParsedNotaCreditoError,
  id: number,
): StampFailedNota | undefined =>
  parsed.notaCredito?.id === id ? parsed.notaCredito : undefined;

/**
 * Motivo para el detalle cuando el backend reporta ESTA nota de vuelta en
 * `Borrador` —Facturama rechazó (`cfdi`), o otra petición la cambió antes del
 * timbre (#751)—, o `null` en cualquier otro caso. Recibe el error ya
 * normalizado: `onError` lo parsea una sola vez.
 */
export const getEmitRejectedDraftDetail = (
  parsed: ParsedNotaCreditoError,
  id: number,
): string | null => {
  if (reportedNota(parsed, id)?.estatus !== "Borrador") return null;
  const detail = stampFailureDetail(parsed);
  return creditNoteEmitRevertedDetail(creditNoteRevertCause(parsed.stampFailed), detail);
};

/**
 * Aviso de una emisión fallida en la que el backend reporta ESTA nota con otro
 * estatus que `Borrador` (ver `getEmitRejectedDraftDetail`), o `null` si no la
 * reporta. Con `Emitida`, `actual` es la nota FRESCA (el `400` no trae
 * `cfdi_uuid` ni `cfdi_pendiente`; `null` si no se pudo consultar): dice si
 * quedó pendiente de confirmación o ya timbrada (`describeEmittedNotaCredito`).
 * En ningún caso se reintenta: la nota ya no es un borrador.
 */
export const getEmitReportedNotaMessage = (
  parsed: ParsedNotaCreditoError,
  id: number,
  label: string,
  actual: EmittedNotaCreditoState | null,
): string | null => {
  const nota = reportedNota(parsed, id);
  if (!nota || nota.estatus === "Borrador") return null;
  const detail = stampFailureDetail(parsed);
  if (nota.estatus === "Cancelada") return creditNoteEmitCancelledMessage(label, detail);
  return describeEmittedNotaCredito("emision", label, detail, actual).message;
};

/**
 * Factura FRESCA de la nota antes de emitirla. Un `404` no es un fallo de la
 * consulta sino una respuesta (la factura ya no existe o el usuario ya no la
 * ve): devuelve `undefined` y `getInvoiceEmitPrecheckReason` la trata como no
 * disponible. Cualquier otro fallo sigue siendo `PrecheckError`.
 */
const fetchFreshRelatedInvoice = async (
  queryClient: ReturnType<typeof useQueryClient>,
  invoiceId: number,
): Promise<Invoice | undefined> => {
  try {
    return await fetchFreshInvoice(queryClient, invoiceId);
  } catch (error) {
    if (error instanceof PrecheckError && isNotFoundError(error.cause)) return undefined;
    throw error;
  }
};

/**
 * Emite una nota que estaba en borrador
 * (`PATCH /finanzas/notas-credito/{id}/` con `{ estatus: "Emitida" }`).
 *
 * SIN actualización optimista, a diferencia de `useCancelNotaCredito` y del
 * precedente `useCancelPago`. La emisión es la operación que MUEVE dinero y el
 * backend la rechaza por condiciones de negocio reales y frecuentes: que la
 * factura no tenga cuenta por cobrar, o que el total supere el saldo disponible.
 * Pintar la fila como `Emitida` para devolverla a `Borrador` medio segundo
 * después diría que un documento contable se emitió cuando no fue así. Se espera
 * al servidor y se invalida; la cancelación sí puede ser optimista porque es
 * idempotente y no tiene precondiciones que puedan fallar.
 *
 * El error se normaliza con `parseNotaCreditoError` —el mismo parser del alta—
 * en vez de `extractErrorMessage`: el 400 del techo llega como
 * `{"total": ["El total de la nota (X) no puede superar el saldo..."]}`, una
 * forma de DRF que `extractErrorMessage` (que solo lee `{ error: string }`) no
 * sabe desenvolver, dejando al usuario con un "Request failed with status code
 * 400" en vez del motivo real.
 *
 * Antes del PATCH pide la nota y su factura FRESCAS y se detiene con
 * `PrecheckError`, sin PATCH:
 * - si la nota ya no es `Borrador`: un `PATCH` a `Emitida` sobre una nota que
 *   otra sesión ya emitió responde `200` sin hacer nada, y se avisaría "emitida
 *   correctamente" de algo que esta sesión no hizo;
 * - si la factura está eliminada, no existe o tiene su timbrado pendiente
 *   (`getInvoiceEmitPrecheckReason`, deliberadamente estrecho).
 * Una factura cancelada o en cancelación no se detiene aquí: el backend la
 * rechaza atómicamente con un `400` en `factura` que ya dice el motivo. Una
 * factura sin timbrar tampoco: el diálogo de confirmación lo avisa, y en la
 * empresa de Facturama el backend la rechaza sin guardar nada.
 * El candado contra el doble envío es el de la fila en `CreditNoteList`.
 *
 * Un fallo después de guardar trae `nota_credito` —con `cfdi` o con otra llave
 * (nucleo-erp #848)— y dice en qué quedó la nota:
 * - `Borrador`: Facturama rechazó, u otra petición la cambió antes del timbre
 *   (#751); la nota volvió a borrador con el saldo intacto. Aviso breve; el
 *   motivo (`getEmitRejectedDraftDetail`) va a `onRejectedToDraft`, con el que
 *   `CreditNoteList` abre el detalle.
 * - `Emitida`: se lee la nota FRESCA (el `400` no trae su timbre) y se avisa si
 *   quedó pendiente de confirmación o ya timbrada con un error posterior
 *   (`getEmitReportedNotaMessage`).
 * - `Cancelada`: otra operación la canceló; se avisa.
 * - Sin `nota_credito` (o de otra nota): no se afirma nada y se pide revisar el
 *   listado.
 *
 * `onSettled` refresca nota, factura, cuenta por cobrar y pedido
 * (`invalidateCreditNoteQueries`): emitir baja el saldo de la cuenta por cobrar
 * de la factura y puede marcarla `Pagada`. El refresco también vale ante un
 * error: un fallo del timbrado puede llegar con la nota ya escrita.
 */
/**
 * Llave de la emisión: con ella el listado lee de la `MutationCache` qué notas
 * tienen una emisión en vuelo (`usePendingRecordIds`; las variables llevan el
 * `id`), aunque la vista se haya remontado y su candado de fila esté vacío.
 */
export const emitirNotaCreditoMutationKey = ["emitir-nota-credito"] as const;

export const useEmitirNotaCredito = ({
  onRejectedToDraft,
}: {
  /** Facturama rechazó y la nota volvió a `Borrador`: su id y el motivo. */
  onRejectedToDraft?: (id: number, detail: string) => void;
} = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: emitirNotaCreditoMutationKey,
    mutationFn: async ({ id }: EmitirNotaCreditoVariables) => {
      // Nota y factura FRESCAS antes del PATCH (`fetchFresh`, staleTime 0): otra
      // sesión pudo emitir o cancelar la nota, o borrar la factura, desde que se
      // pintó el listado.
      const nota = await fetchFreshNotaCredito(queryClient, id);
      if (nota.estatus !== "Borrador") {
        throw new PrecheckError(`La nota ${nota.folio || `#${nota.id}`} ya no está en borrador.`);
      }
      const factura = await fetchFreshRelatedInvoice(queryClient, nota.factura);
      const blockReason = getInvoiceEmitPrecheckReason(nota.factura_folio, factura);
      if (blockReason) throw new PrecheckError(blockReason);
      return emitirNotaCredito(id);
    },
    onSuccess: () => {
      toast.success("Nota de crédito emitida correctamente");
    },
    // Asíncrono: si el backend reporta la nota `Emitida`, su timbre se lee de la
    // nota FRESCA antes de avisar (`readEmittedNota`).
    onError: async (error, { id, label }) => {
      logUnexpectedError(error);
      if (error instanceof PrecheckError) {
        toast.error(error.message);
        return;
      }
      const parsed = parseNotaCreditoError(error);
      const toastId = `emitir-nota-credito-timbrado-${id}`;
      // La nota volvió a borrador (rechazo de Facturama o #751): aviso breve, el
      // motivo completo queda en el detalle que abre el listado.
      const rejectedDetail = getEmitRejectedDraftDetail(parsed, id);
      if (rejectedDetail !== null) {
        toast.error(
          creditNoteEmitRevertedMessage(creditNoteRevertCause(parsed.stampFailed), label),
          { id: toastId },
        );
        onRejectedToDraft?.(id, rejectedDetail);
        return;
      }
      // El backend reporta la nota con otro estatus (`Emitida`, `Cancelada`), o
      // un `cfdi` sin decir en qué quedó: el toast es la ÚNICA explicación (el
      // diálogo ya se cerró) y trae el motivo largo del backend, así que dura lo
      // suficiente para leerlo, con id por nota para no apilarse.
      const reported = reportedNota(parsed, id);
      if (reported || parsed.stampFailed) {
        const actual =
          reported?.estatus === "Emitida" ? await readEmittedNota(queryClient, id, error) : null;
        toast.error(
          getEmitReportedNotaMessage(parsed, id, label, actual) ??
            creditNoteStampFailedMessage("emision", stampFailureDetail(parsed)),
          { id: toastId, duration: STAMP_FAILED_TOAST_DURATION_MS },
        );
        return;
      }
      // Sin confirmación del backend la nota pudo emitirse y timbrarse.
      const message = parsed.unconfirmed
        ? CREDIT_NOTE_EMIT_UNCONFIRMED_MESSAGE
        : parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al emitir la nota de crédito";
      toast.error(message);
    },
    // Se devuelve una promesa para que la mutación siga "pending" hasta que el
    // refetch de la nota termine: así el listado nunca muestra un estado
    // intermedio y el diálogo de confirmación (con `closeOnConfirm={false}`)
    // puede cerrarse aquí. También ante un error: emitir timbra, y un timeout del
    // PAC pudo dejar algo hecho (`invalidateCreditNoteQueries`).
    onSettled: (_nota, error) =>
      invalidateCreditNoteQueries(queryClient, "balances", freshlyReadNotaId(error)),
  });
};
