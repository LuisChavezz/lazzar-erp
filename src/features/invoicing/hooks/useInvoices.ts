import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getInvoices } from "../services/actions";
import type { InvoiceListRow } from "../interfaces/invoice.interface";

interface UseInvoicesOptions {
  /**
   * Oculta las facturas eliminadas (baja lógica, `activo === false`): el
   * listado del backend las incluye. Filtra en ESTE observador (`select`), así
   * que la caché y los demás consumidores siguen viendo todas las filas. Lo
   * usan el listado de facturas y sus KPIs.
   */
  excludeDeleted?: boolean;
}

/** Filas sin las facturas eliminadas; un `activo` ausente cuenta como activa. */
const withoutDeletedInvoices = (rows: InvoiceListRow[]): InvoiceListRow[] =>
  rows.filter((row) => row.activo !== false);

export const useInvoices = ({ excludeDeleted }: UseInvoicesOptions = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    InvoiceListRow[]
  >({
    queryKey: ["invoices"],
    queryFn: getInvoices,
    ...(excludeDeleted ? { select: withoutDeletedInvoices } : {}),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "invoices-refetch-error",
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
