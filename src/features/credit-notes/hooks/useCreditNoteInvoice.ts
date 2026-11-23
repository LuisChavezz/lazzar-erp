import { useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { invoiceRetrieveFreshOptions } from "@/src/features/invoicing/hooks/useInvoiceRetrieveFresh";
import { isForbiddenError, isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import type { CreditNoteInvoiceReadState } from "../utils/creditNoteInvoiceGate";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";

/**
 * Factura elegida en el formulario de alta de una nota, leída FRESCA por id: la
 * misma consulta que el detalle de la factura (`invoiceRetrieveFreshOptions`,
 * `["invoice-detail", id]`, `staleTime: 0`) más `refetchOnMount: "always"`,
 * envuelta en `useGuardedQuery`. `403` y `404` son definitivos (sin reintento ni
 * toast); `definitiveError` dice cuál fue, para dar el motivo correcto.
 *
 * Devuelve la entrada de `getCreditNoteInvoiceState` (`creditNoteInvoiceGate`).
 */
export const useCreditNoteInvoice = (
  id: number | null,
): CreditNoteInvoiceReadState<Invoice> & { refetch: () => void } => {
  const queryClient = useQueryClient();
  const options = invoiceRetrieveFreshOptions(id ?? 0);
  const query = useGuardedQuery(
    { ...options, enabled: id !== null && id > 0, refetchOnMount: "always" },
    {
      toastId: "credit-note-invoice-refetch-error",
      isDefinitiveError: isNotFoundOrForbiddenError,
    },
  );
  // `useGuardedQuery` no expone el error definitivo: se lee de la consulta (el
  // hook se vuelve a pintar cuando cambia) para distinguir `403` de `404`.
  const definitiveError = query.isDefinitiveError
    ? isForbiddenError(queryClient.getQueryState(options.queryKey)?.error)
      ? "forbidden"
      : "notFound"
    : null;

  return {
    hasInvoice: id !== null && id > 0,
    invoice: query.data,
    isFetching: query.isFetching,
    isFetchedAfterMount: query.isFetchedAfterMount,
    isInitialError: query.isInitialError,
    definitiveError,
    refetch: () => void query.refetch(),
  };
};
