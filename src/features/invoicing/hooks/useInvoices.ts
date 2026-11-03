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
  /**
   * Oculta las facturas eliminadas (baja lógica, `activo === false`): el
   * listado del backend las incluye. Filtra en ESTE observador (`select`), así
   * que la caché y los demás consumidores siguen viendo todas las filas — p. ej.
   * los selectores de notas de crédito, que deshabilitan una eliminada con su
   * motivo. Lo usan el listado de facturas y sus KPIs.
   */
  excludeDeleted?: boolean;
}

/** Filas sin las facturas eliminadas; un `activo` ausente cuenta como activa. */
const withoutDeletedInvoices = (rows: InvoiceListRow[]): InvoiceListRow[] =>
  rows.filter((row) => row.activo !== false);

export const useInvoices = ({ refetchOnMount, silent, excludeDeleted }: UseInvoicesOptions = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    InvoiceListRow[]
  >({
    queryKey: ["invoices"],
    queryFn: getInvoices,
    ...(refetchOnMount ? { refetchOnMount } : {}),
    ...(excludeDeleted ? { select: withoutDeletedInvoices } : {}),
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
