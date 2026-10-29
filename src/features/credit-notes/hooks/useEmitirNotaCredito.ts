import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { emitirNotaCredito } from "../services/actions";
import { parseNotaCreditoError, stampFailureDetail } from "./useCreateNotaCredito";
import { invalidateCreditNoteQueries } from "./invalidateCreditNoteQueries";
import {
  CREDIT_NOTE_EMIT_UNCONFIRMED_MESSAGE,
  creditNoteEmitRejectedDetail,
  creditNoteEmitRejectedMessage,
  creditNoteStampFailedMessage,
  creditNoteStampPendingMessage,
  logUnexpectedError,
  STAMP_FAILED_TOAST_DURATION_MS,
  type StampFailedNota,
} from "../utils/creditNoteErrors";
import { getInvoiceEmitBlockReason } from "../utils/creditNoteStamping";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { fetchFreshNotaCredito } from "./fetchFreshNotaCredito";
import { fetchFreshRelatedInvoice } from "./fetchFreshRelatedInvoice";

/** Qué nota se emite: su id y cómo nombrarla en los avisos (folio o `#id`). */
export interface EmitirNotaCreditoVariables {
  id: number;
  label: string;
}

/**
 * La nota que el `400` del timbrado reporta (`nota_credito`), solo si es ESTA
 * nota. Un `nota_credito` de otra nota, o sin él, no dice nada de esta.
 */
const reportedNota = (error: unknown, id: number): StampFailedNota | undefined => {
  const parsed = parseNotaCreditoError(error);
  return parsed.stampFailed && parsed.notaCredito?.id === id ? parsed.notaCredito : undefined;
};

/**
 * Motivo para el detalle cuando Facturama rechazó la emisión y el backend
 * reporta ESTA nota de vuelta en `Borrador`, o `null` en cualquier otro caso.
 * `CreditNoteList` lo usa para abrir el detalle de la nota con el motivo y
 * "Emitir" a la mano.
 */
export const getEmitRejectedDraftDetail = (error: unknown, id: number): string | null => {
  if (reportedNota(error, id)?.estatus !== "Borrador") return null;
  return creditNoteEmitRejectedDetail(stampFailureDetail(parseNotaCreditoError(error)));
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
 * `PrecheckError`, sin PATCH, si la nota ya no es `Borrador` o la factura está
 * `Cancelada`, eliminada o inexistente (`404`), con su CFDI cancelado, con su
 * cancelación pendiente de aceptar o con su timbrado sin confirmar
 * (`getInvoiceEmitBlockReason`, la misma regla del alta `Emitida`). El
 * candado contra el doble envío es el de la fila en `CreditNoteList`.
 *
 * Un fallo del timbrado llega bajo `cfdi` y, cuando el backend sabe en qué
 * quedó la nota, con `nota_credito`:
 * - `Borrador`: Facturama rechazó; la nota volvió a borrador con el saldo
 *   intacto. Aviso breve: el motivo lo muestra el detalle que abre
 *   `CreditNoteList` (`getEmitRejectedDraftDetail`).
 * - `Emitida`: Facturama no confirmó; la nota quedó emitida con el timbrado
 *   pendiente (`creditNoteStampPendingMessage`).
 * - Sin `nota_credito` (o de otra nota): no se afirma nada y se pide revisar el
 *   listado.
 *
 * `onSettled` refresca nota, factura, cuenta por cobrar y pedido
 * (`invalidateCreditNoteQueries`): emitir baja el saldo de la cuenta por cobrar
 * de la factura y puede marcarla `Pagada`. El refresco también vale ante un
 * error: un fallo del timbrado puede llegar con la nota ya escrita.
 */
export const useEmitirNotaCredito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: EmitirNotaCreditoVariables) => {
      // Nota y factura FRESCAS antes del PATCH (`fetchFresh`, staleTime 0): la
      // factura pudo cancelarse después de crear el borrador; el backend la
      // rechaza (#614) y así se avisa sin intentar el PATCH. Con su timbrado
      // sin confirmar el backend no la rechaza, pero la nota fallaría al
      // timbrarse y quedaría `Cancelada`.
      const nota = await fetchFreshNotaCredito(queryClient, id);
      if (nota.estatus !== "Borrador") {
        throw new PrecheckError(`La nota ${nota.folio || `#${nota.id}`} ya no está en borrador.`);
      }
      const factura = await fetchFreshRelatedInvoice(queryClient, nota.factura);
      const blockReason = getInvoiceEmitBlockReason(nota.factura_folio, factura);
      if (blockReason) throw new PrecheckError(blockReason);
      return emitirNotaCredito(id);
    },
    onSuccess: () => {
      toast.success("Nota de crédito emitida correctamente");
    },
    onError: (error, { id, label }) => {
      logUnexpectedError(error);
      if (error instanceof PrecheckError) {
        toast.error(error.message);
        return;
      }
      const parsed = parseNotaCreditoError(error);
      if (parsed.stampFailed) {
        const nota = reportedNota(error, id);
        const detail = stampFailureDetail(parsed);
        // Rechazo con la nota de vuelta en borrador: aviso breve, el motivo
        // completo queda en el detalle que abre el listado.
        if (nota?.estatus === "Borrador") {
          toast.error(creditNoteEmitRejectedMessage(label), {
            id: `emitir-nota-credito-timbrado-${id}`,
          });
          return;
        }
        // Pendiente, o sin saber en qué quedó: el toast es la ÚNICA explicación
        // (el diálogo ya se cerró) y trae el motivo largo de Facturama, así que
        // dura lo suficiente para leerlo, con id por nota para no apilarse.
        toast.error(
          nota?.estatus === "Emitida"
            ? creditNoteStampPendingMessage(label, detail)
            : creditNoteStampFailedMessage("emision", detail),
          { id: `emitir-nota-credito-timbrado-${id}`, duration: STAMP_FAILED_TOAST_DURATION_MS },
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
    onSettled: () => invalidateCreditNoteQueries(queryClient, "balances"),
  });
};
