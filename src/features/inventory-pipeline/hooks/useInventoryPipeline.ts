import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getInventoryPipeline } from "../services/actions";
import { mapInventoryPipelineRows } from "../utils/inventory-pipeline.utils";
import type {
  InventoryPipelineResultadoApi,
  InventoryPipelineRow,
} from "../interfaces/inventory-pipeline.interface";

/**
 * Reporte de existencias, producción y compras (ver `getInventoryPipeline`).
 * Llave `["inventory-pipeline"]`, sin parámetros porque el reporte no los
 * lleva.
 *
 * El mapeo API → modelo de vista va en `select` y no en la vista: la caché
 * guarda la respuesta cruda y todo consumidor recibe ya las filas de
 * `mapInventoryPipelineRows`. `select` es una referencia estable de módulo,
 * así que TanStack solo lo re-ejecuta cuando cambian los datos.
 *
 * `hasLoaded` distingue una carga inicial fallida (error en el cuerpo de la
 * tabla) de un refetch fallido con datos en caché (toast + conservar la
 * tabla). Mismo patrón que `useCorteMangaOrders`.
 */
export const useInventoryPipeline = () => {
  const query = useQuery<InventoryPipelineResultadoApi[], Error, InventoryPipelineRow[]>({
    queryKey: ["inventory-pipeline"],
    queryFn: () => getInventoryPipeline(),
    select: mapInventoryPipelineRows,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    errorUpdatedAt: query.errorUpdatedAt,
    toastId: "inventory-pipeline-refetch-error",
  });

  return {
    rows: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
