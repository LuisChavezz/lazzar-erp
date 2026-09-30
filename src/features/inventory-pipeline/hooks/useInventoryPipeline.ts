import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { getInventoryPipeline } from "../services/actions";
import { mapInventoryPipelineRows } from "../utils/inventory-pipeline.utils";
import type {
  InventoryPipelineResultadoApi,
  InventoryPipelineRow,
} from "../interfaces/inventory-pipeline.interface";

/**
 * Reporte de existencias, producción y compras (ver `getInventoryPipeline`),
 * acotado a la empresa del workspace. Llave `["inventory-pipeline", companyId]`
 * y deshabilitado sin empresa — mismo patrón que `useCompanyBranches`.
 *
 * `staleTime: 0` solo aquí (el global es de 15 min): es una foto del momento
 * para decidir resurtido, así que al volver a la página se pintan las filas en
 * caché y se refrescan de inmediato en vez de servir existencias viejas.
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
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  const query = useQuery<InventoryPipelineResultadoApi[], Error, InventoryPipelineRow[]>({
    queryKey: ["inventory-pipeline", companyId],
    queryFn: () => getInventoryPipeline(companyId!),
    enabled: !!companyId,
    staleTime: 0,
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
