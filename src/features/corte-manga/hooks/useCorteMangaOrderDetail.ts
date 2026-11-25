import { useQuery } from "@tanstack/react-query";
import { getCorteMangaOrderDetail } from "../services/actions";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

/** Prefijo de los detalles de OCM: invalidarlo refresca el de TODAS las órdenes. */
export const CORTE_MANGA_ORDER_DETAIL_KEY = ["corte-manga-order-detail"] as const;

/** Llave del detalle; la comparte la mutación de edición para invalidarlo. */
export const corteMangaOrderDetailQueryKey = (id: number | null) =>
  [...CORTE_MANGA_ORDER_DETAIL_KEY, id] as const;

/**
 * Detalle de una orden de corte de manga
 * (`GET /produccion/orden-corte-manga/{id}/`). Llave
 * `["corte-manga-order-detail", id]`.
 *
 * Mismo patrón que `useEmbroideryOrderDetail`/`useReflectiveOrderDetail`: id
 * nullable y `enabled` que mantiene la consulta APAGADA mientras no haya una
 * orden seleccionada, de modo que un `id` nulo o inválido no dispara petición.
 *
 * `list` y `retrieve` no comparten serializer ni forma: el detalle añade
 * `pedido_vinculado`, la cobertura, las órdenes hermanas, los avances y los
 * campos completos por línea, y su `resumen_avance` es el del detalle, no el
 * del listado. Ambos se describen con `CorteMangaOrder`, que declara
 * OPCIONALES los campos que solo trae una de las dos acciones; quien los use
 * debe comprobarlos. `fecha_pedido` y `fecha_vence` llegan en las dos desde
 * EC-880.
 *
 * Lo consumen la página de detalle (`CorteMangaOrderPageContent`) y el
 * envoltorio por id del diálogo (`CorteMangaOrderDetailByIdDialog`, que usa la
 * hoja "Documentos" del detalle de pedido). La vista de listado
 * NO lo usa: arma su diálogo con la fila en caché.
 */
export const useCorteMangaOrderDetail = (id: number | null) => {
  return useQuery<CorteMangaOrder>({
    queryKey: corteMangaOrderDetailQueryKey(id),
    queryFn: () => getCorteMangaOrderDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
