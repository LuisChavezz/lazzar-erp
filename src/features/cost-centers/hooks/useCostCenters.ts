import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getCostCenters } from "../services/actions";
import type {
  CostCenter,
  CostCenterQueryParams,
} from "../interfaces/cost-center.interface";

/**
 * Raíz de la llave del recurso. Invalidar por este PREFIJO alcanza a todas las
 * vistas del catálogo sin importar sus parámetros: la pantalla completa y los
 * selectores de centro de costo de la póliza, que piden solo los activos.
 * Cualquier escritura de este módulo invalida por aquí.
 */
export const COST_CENTERS_KEY_ROOT = ["centros-costo"] as const;

/**
 * Llave EXACTA del catálogo COMPLETO (sin parámetros de servidor). La usa la
 * actualización optimista del toggle, que tiene que escribir sobre esa lista
 * concreta —no sobre una vista filtrada, donde el centro puede ni estar—.
 */
export const COST_CENTERS_LIST_KEY = ["centros-costo", {}] as const;

/**
 * Catálogo de centros de costo.
 *
 * La respuesta es un arreglo plano (sin paginación), así que el hook expone la
 * lista entera y quien la consuma decide qué hacer con ella —`DataTable` busca,
 * filtra y pagina en memoria, mismo trato que `useBanks` y `useChartOfAccounts`—.
 *
 * ─── LOS PARÁMETROS VAN AL SERVIDOR Y A LA LLAVE ─────────────────────────────
 *
 * `params` se manda tal cual al `get_queryset` (no es una aproximación en
 * cliente) y forma parte de la LLAVE DE CACHÉ. Eso es lo que permite que
 * convivan dos vistas distintas del mismo recurso sin pisarse: la pantalla del
 * catálogo, que no pasa parámetros y muestra también los dados de baja, y los
 * selectores de la póliza, que piden `{ activo: true }` porque un centro
 * retirado no debe ofrecerse en una captura nueva.
 *
 * Con una llave fija, ambas compartirían una sola entrada y la última en montar
 * decidiría lo que ve la otra.
 *
 * OJO al omitir: para pedir TODO el catálogo se llama sin argumentos. Mandar
 * `{ activo: undefined }` es equivalente (Axios descarta la llave), pero
 * `{ activo: false }` NO es "todos" — el backend devolvería solo los inactivos
 * (ver `CostCenterQueryParams`).
 */
export const useCostCenters = (params?: CostCenterQueryParams) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    CostCenter[]
  >({
    queryKey: ["centros-costo", params ?? {}],
    queryFn: () => getCostCenters(params),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "centros-costo-refetch-error",
  });

  return {
    centrosCosto: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
