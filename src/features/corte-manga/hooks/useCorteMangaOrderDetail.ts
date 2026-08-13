import { useQuery } from "@tanstack/react-query";
import { getCorteMangaOrderDetail } from "../services/actions";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

/**
 * Detalle de una orden de corte de manga
 * (`GET /produccion/orden-corte-manga/{id}/`). Llave
 * `["corte-manga-order-detail", id]`.
 *
 * Mismo patrón que `useEmbroideryOrderDetail`/`useReflectiveOrderDetail`: id
 * nullable y `enabled` que mantiene la consulta APAGADA mientras no haya una
 * orden seleccionada, de modo que un `id` nulo o inválido no dispara petición.
 *
 * DIFERENCIA con bordado/reflejante: allá el hook corrige que `list` y
 * `retrieve` dejaron de compartir serializer; aquí ambos comparten el mismo
 * `OrdenesCorteMangaSerializer`, así que el retorno es `CorteMangaOrder` (el
 * mismo tipo del listado). El hook no lo usa la vista de listado —que arma el
 * diálogo con la fila en caché—, sino consumidores que solo tienen el id, como
 * la sección "Documentos relacionados" del detalle de pedido.
 */
export const useCorteMangaOrderDetail = (id: number | null) => {
  return useQuery<CorteMangaOrder>({
    queryKey: ["corte-manga-order-detail", id],
    queryFn: () => getCorteMangaOrderDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
