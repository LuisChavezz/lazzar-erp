import { useQuery } from "@tanstack/react-query";
import { getEmbroideryOrderDetail } from "../services/actions";
import type { EmbroideryOrderDetail } from "../interfaces/embroidery.interface";

/**
 * Detalle de una orden de bordado (`GET /produccion/orden-bordado/{id}/`).
 * Llave `["embroidery-order-detail", id]`.
 *
 * Mismo patrón que `useReceiptDetail`/`useTransferenciaDetail`/`useQuote`: id
 * nullable y `enabled` que mantiene la consulta APAGADA mientras no haya una
 * orden seleccionada. `EmbroideryOrderDetailDialog` solo se monta con el
 * diálogo abierto, pero el `enabled` es lo que garantiza que un `id` nulo o
 * inválido —el que deja el diálogo al cerrarse— no dispare una petición.
 *
 * Este hook corrige una desviación, no la introduce: el diálogo de bordado
 * armaba el detalle con la fila del listado, apoyado en que `list` y `retrieve`
 * compartían serializer. Dejaron de compartirlo, así que la fila ya no contiene
 * el detalle (ver `getEmbroideryOrderDetail`).
 */
export const useEmbroideryOrderDetail = (id: number | null) => {
  return useQuery<EmbroideryOrderDetail>({
    queryKey: ["embroidery-order-detail", id],
    queryFn: () => getEmbroideryOrderDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
