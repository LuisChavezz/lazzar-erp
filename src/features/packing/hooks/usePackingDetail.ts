import { useQuery } from "@tanstack/react-query";
import { getPackingDetail } from "../services/actions";
import type { Packing } from "../interfaces/packing.interface";

/**
 * Detalle de un packing (`GET /wms/packings/{id}/`). Llave
 * `["packing-detail", id]`.
 *
 * Mismo patrón que `usePickingDetail`/`useCorteMangaOrderDetail`: id nullable y
 * `enabled` que mantiene la consulta APAGADA sin un id válido. A diferencia de
 * picking, NO expone `dataUpdatedAt`: el diálogo de packing consume el `Packing`
 * crudo y no hay enriquecimiento por tiempo (`esta_vencida`) que calcular.
 *
 * No lo usa la vista de listado —que arma el diálogo con la fila en caché—, sino
 * consumidores que solo tienen el id, como la sección "Documentos relacionados"
 * del detalle de pedido.
 */
export const usePackingDetail = (id: number | null) => {
  return useQuery<Packing>({
    queryKey: ["packing-detail", id],
    queryFn: () => getPackingDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
