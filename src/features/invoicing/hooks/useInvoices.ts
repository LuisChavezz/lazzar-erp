import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getInvoices } from "../services/actions";
import type { InvoiceListRow } from "../interfaces/invoice.interface";

interface UseInvoicesOptions {
  /**
   * `"always"`: este observador vuelve a pedir el listado al montarse aunque la
   * caché siga fresca (p. ej. el selector de facturas de notas de crédito, que
   * decide con los flags del CFDI). Mientras tanto se siguen leyendo los datos
   * en caché. Sin la opción, el `refetchOnMount` por defecto.
   */
  refetchOnMount?: "always";
  /** Sin toast por un refetch fallido (ver `useHasLoadedQuery.silent`). */
  silent?: boolean;
}

export const useInvoices = ({ refetchOnMount, silent }: UseInvoicesOptions = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    InvoiceListRow[]
  >({
    queryKey: ["invoices"],
    queryFn: getInvoices,
    ...(refetchOnMount ? { refetchOnMount } : {}),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "invoices-refetch-error",
    silent,
  });

  return {
    invoices: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
