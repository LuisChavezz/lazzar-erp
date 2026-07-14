import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getCuentasPorCobrar } from "../services/actions";
import type {
  CuentaPorCobrar,
  CuentaPorCobrarQueryParams,
} from "../interfaces/accounts-receivable.interface";

/**
 * useCuentasPorCobrar
 *
 * Lee la lista de cuentas por cobrar (`GET /finanzas/cuentas-por-cobrar/`).
 *
 * Se trae la lista COMPLETA (el backend ya la acota a la empresa del usuario, así
 * que está limitada) y el filtrado/búsqueda de la tabla ocurre en el cliente:
 * `DataTable` filtra su `data` internamente y no expone un puente para traducir
 * sus filtros/búsqueda a parámetros de servidor. Por eso el hook admite `params`
 * (para uso futuro / consumo directo del endpoint) pero las tarjetas y la tabla
 * lo invocan sin argumentos, compartiendo así una única entrada de caché.
 *
 * La llave comienza con `["accounts-receivable"]`, que es exactamente el prefijo
 * que invalida la mutación de "Registrar CxC" (`useRegisterPendingInvoice`), de
 * modo que registrar una factura refresca esta lista.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (mostrar un toast y conservar la vista).
 * Las tarjetas y la tabla comparten el mismo `toastId`, así que un refetch
 * fallido genera UN solo toast aunque ambos componentes usen este hook.
 */
export const useCuentasPorCobrar = (params?: CuentaPorCobrarQueryParams) => {
  const query = useQuery<CuentaPorCobrar[]>({
    queryKey: ["accounts-receivable", params ?? {}],
    queryFn: () => getCuentasPorCobrar(params),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "accounts-receivable-refetch-error",
  });

  return {
    cuentas: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
