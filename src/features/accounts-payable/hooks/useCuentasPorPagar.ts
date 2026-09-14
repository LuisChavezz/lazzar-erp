import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getCuentasPorPagar } from "../services/actions";
import type {
  CuentaPorPagar,
  CuentaPorPagarQueryParams,
} from "../interfaces/accounts-payable.interface";

/**
 * useCuentasPorPagar
 *
 * Listado de cuentas por pagar (`GET /finanzas/cuentas-por-pagar/`). La respuesta
 * es un arreglo plano (sin paginación): el hook expone la lista completa y
 * `DataTable` busca, filtra y pagina en memoria. Mismo molde que
 * `useCuentasPorCobrar` — admite `params` para consumo directo del endpoint, pero
 * la pantalla lo invoca sin argumentos y comparte una única entrada de caché.
 *
 * LLAVE: `["cuentas-por-pagar", params ?? {}]`. El prefijo `["cuentas-por-pagar"]`
 * es EXACTAMENTE el que invalidan `useCreatePago` y `useCancelPago` en `payments`
 * (aplicar o cancelar un pago mueve saldos y estatus de las CxP), así que esta
 * lista se refresca sola sin que `payments` sepa que existe. No choca con el
 * selector de pagos (`["cuentas-por-pagar", proveedorId]`): su segundo elemento es
 * un número o `null`, nunca un objeto.
 *
 * Distinto del `useCuentasPorPagar` de `payments`, que es otra consulta (CxP
 * APLICABLES de un proveedor, con `saldo_pendiente=true` y recorte por estatus).
 *
 * `hasLoaded` distingue una carga inicial fallida (el estado de error de la
 * tabla) de un refetch fallido con datos en caché (un toast y conservar la
 * vista).
 */
export const useCuentasPorPagar = (params?: CuentaPorPagarQueryParams) => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    CuentaPorPagar[]
  >({
    queryKey: ["cuentas-por-pagar", params ?? {}],
    queryFn: () => getCuentasPorPagar(params),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "cuentas-por-pagar-refetch-error",
  });

  return {
    cuentasPorPagar: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
