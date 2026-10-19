import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { stampInvoice } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";
import { isInvoiceStampable, stampInvoiceErrorMessage } from "../utils/invoiceStamping";
import { invoiceDesgloseQueryKey } from "./useInvoiceDesglose";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";

/** Candado del timbrado, ÚNICO por factura (ver `useStampInvoice`). */
export const stampInvoiceMutationKey = (invoiceId: number) =>
  ["stamp-invoice", invoiceId] as const;

/**
 * Resultado de timbrar. `not-stampable`: el retrieve previo encontró la
 * factura ya timbrada, o ya no `Emitida` y activa, y NO se hizo el POST.
 */
export type StampInvoiceResult =
  | { outcome: "stamped"; invoice: Invoice }
  | { outcome: "not-stampable"; invoice: Invoice };

/** Motivo propio de un fallo antes del POST (el retrieve previo no respondió). */
class StampInvoicePrecheckError extends Error {}

/**
 * Timbra el CFDI de UNA factura (`POST /finanzas/facturas/{id}/timbrar/`), un
 * acto fiscal irreversible. Mismo esquema que `useCancelInvoice`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   FACTURA (`stampInvoiceMutationKey`). `stamp` lo consulta de forma SÍNCRONA
 *   contra la caché de mutaciones (`isPending` llega un render tarde), así que
 *   sobrevive a un remontaje.
 * - Antes del POST pide el retrieve FRESCO: si la factura ya trae `cfdi_uuid`
 *   (la timbró otra persona) o dejó de ser una `Emitida` activa, NO se hace el
 *   POST y se avisa.
 * - Al TERMINAR, con cualquier resultado, refresca solo el listado, el retrieve
 *   y el desglose de esa factura: el timbrado no toca estatus, CxC ni póliza.
 *
 * Errores: toast con el mensaje de `cfdi` o `estatus` (`stampInvoiceErrorMessage`).
 */
export const useStampInvoice = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = stampInvoiceMutationKey(invoiceId);
  const isStamping = useIsMutating({ mutationKey, exact: true }) > 0;

  const mutation = useMutation<StampInvoiceResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      let current: Invoice;
      try {
        current = await queryClient.fetchQuery(invoiceRetrieveFreshOptions(invoiceId));
      } catch (error) {
        throw new StampInvoicePrecheckError(
          extractErrorMessage(error, "No se pudo consultar la factura."),
        );
      }
      if (!isInvoiceStampable(current)) {
        return { outcome: "not-stampable", invoice: current };
      }
      const invoice = await stampInvoice(invoiceId);
      return { outcome: "stamped", invoice };
    },
    onSuccess: ({ outcome, invoice }) => {
      const label = invoice.folio || `#${invoice.id}`;
      if (outcome === "not-stampable") {
        toast.error(
          invoice.cfdi_uuid
            ? `La factura ${label} ya estaba timbrada (UUID ${invoice.cfdi_uuid}).`
            : `La factura ${label} ya no puede timbrarse.`,
        );
        return;
      }
      toast.success(
        invoice.cfdi_uuid
          ? `Factura ${label} timbrada. UUID ${invoice.cfdi_uuid}`
          : `Factura ${label} timbrada`,
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof StampInvoicePrecheckError ? error.message : stampInvoiceErrorMessage(error),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
      queryClient.invalidateQueries({ queryKey: invoiceDesgloseQueryKey(invoiceId) });
    },
  });

  /**
   * Dispara el timbrado salvo que ya haya uno en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSettled` corre al terminar, con
   * cualquier resultado.
   */
  const stamp = (options: { onSettled?: () => void } = {}) => {
    if (queryClient.isMutating({ mutationKey, exact: true }) > 0) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { stamp, isStamping };
};
