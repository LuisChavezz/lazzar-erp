import type { QueryClient } from "@tanstack/react-query";
import { fetchFresh } from "@/src/hooks/useMutationLock";
import type { Invoice } from "../interfaces/invoice.interface";
import { getInvoiceDetail } from "../services/actions";
import { invoiceDesgloseQueryKey } from "./useInvoiceDesglose";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";

/**
 * Andamiaje común de las acciones irreversibles sobre UNA factura
 * (`useCancelInvoice`, `useStampInvoice`). Cada hook conserva sus propias
 * reglas de precheck, mensajes y endpoint; aquí solo vive lo que comparten. El
 * candado contra el doble envío y el error del precheck son genéricos
 * (`useMutationLock`, `PrecheckError` en `src/hooks/useMutationLock.ts`).
 */

/**
 * Retrieve FRESCO de la factura antes de la acción (`fetchFresh`): una petición
 * propia siempre refleja el estado actual y no aborta la consulta en vuelo de
 * la página (lo que haría `cancelQueries`). Queda escrito en
 * `["invoice-detail", id]`. Si falla, lanza `PrecheckError`.
 */
export const fetchFreshInvoice = (
  queryClient: QueryClient,
  invoiceId: number,
): Promise<Invoice> =>
  fetchFresh(
    queryClient,
    invoiceRetrieveFreshOptions(invoiceId).queryKey,
    () => getInvoiceDetail(invoiceId),
    "No se pudo consultar la factura.",
  );

/**
 * Refresca lo que cualquier acción sobre la factura cambia: listado, retrieve y
 * desglose. Con `sentRequest: false` (el precheck detuvo la acción y no hubo
 * POST) el retrieve NO se vuelve a pedir: el precheck acaba de escribirlo en la
 * caché. Ante un error (con o sin POST) va `true`: es más seguro releer.
 */
export const invalidateInvoiceBaseQueries = (
  queryClient: QueryClient,
  invoiceId: number,
  { sentRequest = true }: { sentRequest?: boolean } = {},
) => {
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  if (sentRequest) queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
  queryClient.invalidateQueries({ queryKey: invoiceDesgloseQueryKey(invoiceId) });
};
