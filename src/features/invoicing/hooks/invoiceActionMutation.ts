import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { Invoice } from "../interfaces/invoice.interface";
import { invoiceDesgloseQueryKey } from "./useInvoiceDesglose";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";

/**
 * Andamiaje común de las acciones irreversibles sobre UNA factura
 * (`useCancelInvoice`, `useStampInvoice`). Cada hook conserva sus propias
 * reglas de precheck, mensajes y endpoint; aquí solo vive lo que comparten.
 */

/** Fallo ANTES del POST: el retrieve previo no respondió. Su `message` va tal cual al toast. */
export class InvoicePrecheckError extends Error {}

/**
 * Retrieve FRESCO de la factura antes de la acción (misma llave y opciones que
 * la página de detalle, así que también la refresca). Si falla, lanza
 * `InvoicePrecheckError` con el motivo listo para el toast.
 */
export const fetchFreshInvoice = async (
  queryClient: QueryClient,
  invoiceId: number,
): Promise<Invoice> => {
  try {
    return await queryClient.fetchQuery(invoiceRetrieveFreshOptions(invoiceId));
  } catch (error) {
    throw new InvoicePrecheckError(extractErrorMessage(error, "No se pudo consultar la factura."));
  }
};

/** Refresca lo que cualquier acción sobre la factura cambia: listado, retrieve y desglose. */
export const invalidateInvoiceBaseQueries = (queryClient: QueryClient, invoiceId: number) => {
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
  queryClient.invalidateQueries({ queryKey: invoiceDesgloseQueryKey(invoiceId) });
};

/**
 * Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 * FACTURA. `isRunning` es para pintar (llega un render tarde); `isIdle()`
 * consulta la caché de mutaciones de forma SÍNCRONA, así que sobrevive a un
 * remontaje y es el mismo para todos los diálogos de esa factura.
 */
export const useInvoiceMutationLock = (mutationKey: QueryKey) => {
  const queryClient = useQueryClient();
  const isRunning = useIsMutating({ mutationKey, exact: true }) > 0;
  const isIdle = () => queryClient.isMutating({ mutationKey, exact: true }) === 0;
  return { isRunning, isIdle };
};
