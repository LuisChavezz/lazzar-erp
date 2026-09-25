import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getConciliaciones } from "../services/actions";
import type {
  ConciliacionBancaria,
  ConciliacionBancariaQueryParams,
} from "../interfaces/bank-reconciliation.interface";

/**
 * Raíz de la llave del recurso. Invalidar por este PREFIJO alcanza a todas las
 * vistas del recurso sin importar sus parámetros: la pantalla filtrada por
 * cuenta y periodo, y la consulta de solapamiento que el formulario hace antes
 * de preparar. Cualquier escritura de este módulo invalida por aquí.
 */
export const CONCILIACIONES_KEY_ROOT = ["conciliaciones-bancarias"] as const;

/**
 * Conciliaciones bancarias, filtradas EN EL SERVIDOR.
 *
 * A diferencia de los catálogos de finanzas, aquí los parámetros no son
 * decorativos: el periodo no se puede filtrar en memoria porque el backend
 * resuelve el SOLAPAMIENTO de rangos, y `DataTable` solo sabe comparar valores
 * de una columna. Por eso los controles viven fuera de la tabla y alimentan
 * este hook, igual que el filtro de almacén de `useStockItems`.
 *
 * `params` forma parte de la LLAVE DE CACHÉ, así que las dos vistas del recurso
 * —la pantalla y la comprobación previa del formulario, que piden rangos
 * distintos— conviven sin pisarse.
 *
 * `enabled` deja no consultar mientras no haya cuenta y periodo: sin ellos la
 * petición traería todas las conciliaciones de la empresa, que no es lo que la
 * pantalla quiere mostrar.
 */
export const useConciliaciones = (
  params?: ConciliacionBancariaQueryParams,
  options?: { enabled?: boolean },
) => {
  const enabled = options?.enabled ?? true;

  const {
    data: queryData,
    isLoading,
    isError,
    errorUpdatedAt,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useQuery<ConciliacionBancaria[]>({
    queryKey: ["conciliaciones-bancarias", params ?? {}],
    queryFn: () => getConciliaciones(params),
    enabled,
    // Al cambiar de un filtro VÁLIDO a otro se mantienen los datos previos
    // mientras llega la consulta nueva, en vez de parpadear a pantalla de
    // carga completa.
    //
    // SOLO con la consulta habilitada: TanStack Query v5 aplica
    // `placeholderData` a cualquier consulta en estado `pending`, esté o no
    // habilitada. Sin esta condición, al vaciar la cuenta o dejar un rango
    // inválido la pantalla seguía listando las conciliaciones del filtro
    // anterior —con Cerrar y Cancelar activos sobre una cuenta que ya no está
    // seleccionada—.
    placeholderData: enabled ? keepPreviousData : undefined,
  });

  // Sin consulta vigente no hay filas: una consulta deshabilitada significa
  // "no hay un filtro válido que pedir", y cualquier dato que conserve la caché
  // bajo esa llave no describe lo que el usuario tiene seleccionado.
  const data = enabled ? queryData : undefined;

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "conciliaciones-bancarias-refetch-error",
  });

  return {
    conciliaciones: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  };
};
