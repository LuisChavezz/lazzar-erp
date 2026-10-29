import type { QueryClient } from "@tanstack/react-query";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { fetchFreshInvoice } from "@/src/features/invoicing/hooks/invoiceActionMutation";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";

/**
 * Retrieve FRESCO de la factura de una nota antes de emitirla (alta `Emitida` o
 * "Emitir" de un borrador). Un `404` no es un fallo de la consulta sino una
 * respuesta: la factura ya no existe o el usuario ya no la ve, así que devuelve
 * `undefined` y `getInvoiceEmitBlockReason` la trata como no disponible.
 * Cualquier otro fallo sigue siendo `PrecheckError` (`fetchFreshInvoice`).
 */
export const fetchFreshRelatedInvoice = async (
  queryClient: QueryClient,
  invoiceId: number,
): Promise<Invoice | undefined> => {
  try {
    return await fetchFreshInvoice(queryClient, invoiceId);
  } catch (error) {
    if (error instanceof PrecheckError && isNotFoundError(error.cause)) return undefined;
    throw error;
  }
};
