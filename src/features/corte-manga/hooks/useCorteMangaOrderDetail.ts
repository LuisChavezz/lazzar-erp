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
 * `list` y `retrieve` tampoco comparten serializer aquí, pero el detalle es un
 * superconjunto ESTRICTO del renglón del listado (añade `pedido_vinculado` y
 * los campos completos por línea), así que el retorno sigue siendo
 * `CorteMangaOrder` —con `pedido_vinculado` opcional— y no hace falta un tipo
 * de detalle aparte como en bordado/reflejante.
 *
 * Lo consumen la página de detalle (`CorteMangaOrderPageContent`) y el
 * envoltorio por id del diálogo (`CorteMangaOrderDetailByIdDialog`, que usa la
 * sección "Documentos relacionados" del detalle de pedido). La vista de listado
 * NO lo usa: arma su diálogo con la fila en caché.
 */
export const useCorteMangaOrderDetail = (id: number | null) => {
  return useQuery<CorteMangaOrder>({
    queryKey: ["corte-manga-order-detail", id],
    queryFn: () => getCorteMangaOrderDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
