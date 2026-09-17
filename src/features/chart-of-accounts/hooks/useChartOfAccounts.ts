import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getChartOfAccounts } from "../services/actions";
import type {
  CuentaContable,
  CuentaContableQueryParams,
} from "../interfaces/chart-of-account.interface";

/**
 * Raíz de la llave del recurso. Invalidar por este PREFIJO alcanza a todas las
 * vistas del catálogo sin importar sus parámetros: la pantalla completa y el
 * selector de cuentas de la póliza, que pide el subconjunto que acepta
 * movimientos. Cualquier escritura de este módulo invalida por aquí.
 */
export const CHART_OF_ACCOUNTS_KEY_ROOT = ["cuentas-contables"] as const;

/**
 * Llave EXACTA del catálogo COMPLETO (sin parámetros de servidor). La usa la
 * actualización optimista del toggle, que tiene que escribir sobre esa lista
 * concreta —no sobre una vista filtrada, donde la cuenta puede ni estar—.
 */
export const CHART_OF_ACCOUNTS_LIST_KEY = ["cuentas-contables", {}] as const;

/**
 * Catálogo de cuentas contables.
 *
 * La respuesta es un arreglo plano (sin paginación), así que el hook expone la
 * lista entera y quien la consuma decide qué hacer con ella —`DataTable` busca,
 * filtra y pagina en memoria, mismo trato que `useBanks`—.
 *
 * ─── LOS PARÁMETROS VAN AL SERVIDOR Y A LA LLAVE ─────────────────────────────
 *
 * `params` se manda tal cual al `get_queryset` (no es una aproximación en
 * cliente) y forma parte de la LLAVE DE CACHÉ. Eso es lo que permite que
 * convivan dos vistas distintas del mismo recurso sin pisarse: la pantalla del
 * catálogo, que no pasa parámetros y muestra también las inactivas y las de
 * agrupación, y el selector de movimientos de una póliza, que pide
 * `{ acepta_movimientos: true, activo: true }` porque una cuenta de agrupación
 * no puede recibir un cargo o un abono y una inactiva no debe ofrecerse.
 *
 * Con una llave fija, ambas compartirían una sola entrada y la última en montar
 * decidiría lo que ve la otra.
 */
export const useChartOfAccounts = (params?: CuentaContableQueryParams) => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    CuentaContable[]
  >({
    queryKey: ["cuentas-contables", params ?? {}],
    queryFn: () => getChartOfAccounts(params),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "cuentas-contables-refetch-error",
  });

  return {
    cuentasContables: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
