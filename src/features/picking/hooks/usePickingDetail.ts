import { useQuery } from "@tanstack/react-query";
import { pickingDetailQueryKey } from "../constants/pickingQueryKeys";
import { getPickingDetail } from "../services/actions";
import type { Picking } from "../interfaces/picking.interface";

/**
 * Detalle de un picking (`GET /wms/pickings/{id}/`). Llave
 * `["picking-detail", id]`.
 *
 * Mismo patrón que `useCorteMangaOrderDetail`/`useReflectiveOrderDetail`: id
 * nullable y `enabled` que mantiene la consulta APAGADA sin un id válido.
 *
 * Expone `dataUpdatedAt` a propósito: el consumidor lo usa como `nowMs` al
 * enriquecer con `mapPickingToRow` (que deriva `esta_vencida` comparando la
 * `fecha_limite` contra ese instante). Es una lectura PURA en render —a
 * diferencia de `Date.now()`, que el React Compiler prohíbe—.
 */
export const usePickingDetail = (id: number | null) => {
  const query = useQuery<Picking>({
    queryKey: pickingDetailQueryKey(id),
    queryFn: () => getPickingDetail(id as number),
    enabled: id !== null && id > 0,
  });

  return {
    picking: query.data,
    dataUpdatedAt: query.dataUpdatedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};
