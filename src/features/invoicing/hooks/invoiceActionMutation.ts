import type { QueryClient } from "@tanstack/react-query";
import { toPrecheckError } from "@/src/hooks/useMutationLock";
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
 * Retrieve FRESCO de la factura antes de la acción. Llama al servicio
 * directamente, sin `fetchQuery`: `fetchQuery` reutiliza un retrieve que ya
 * esté en vuelo para `["invoice-detail", id]`, y ese pudo salir ANTES de que
 * otra pestaña timbrara o cancelara, así que el precheck decidiría con datos
 * viejos. Una petición propia siempre refleja el estado actual, y no aborta la
 * consulta en vuelo de la página (lo que haría `cancelQueries`). El resultado
 * se escribe en la caché de esa llave, así que la vista también queda al día.
 * Si falla, lanza `PrecheckError` con el motivo listo para el toast.
 */
export const fetchFreshInvoice = async (
  queryClient: QueryClient,
  invoiceId: number,
): Promise<Invoice> => {
  let invoice: Invoice;
  try {
    invoice = await getInvoiceDetail(invoiceId);
  } catch (error) {
    throw toPrecheckError(error, "No se pudo consultar la factura.");
  }
  queryClient.setQueryData(invoiceRetrieveFreshOptions(invoiceId).queryKey, invoice);
  return invoice;
};

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
