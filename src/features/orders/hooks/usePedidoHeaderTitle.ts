import { useQuery } from "@tanstack/react-query";
import { getPedidoDetail } from "../services/actions";
import type { PedidoDetail } from "../interfaces/order.interface";
import { pedidoDetailQueryKey } from "./usePedidoDetail";

/** Solo el detalle 360° (`/orders/{id}`), no sus sub-rutas (`edit-mesa-control`). */
const PEDIDO_DETAIL_PATH = /^\/orders\/(\d+)$/;

/**
 * Título del encabezado global en el detalle 360° del pedido: su folio, en vez
 * del id que `getPageTitle` saca del último segmento de la ruta.
 *
 * NO pide nada: se suscribe a la caché del detalle (`["pedido-detail", id]`)
 * que ya llena `PedidoDetailContent`, con `enabled: false`, así que el título
 * aparece cuando llega el detalle y se actualiza con cada relectura. Fuera de
 * esa ruta, o mientras no hay datos, devuelve `null` y el encabezado usa
 * `getPageTitle`.
 */
export const usePedidoHeaderTitle = (pathname: string | null): string | null => {
  const id = Number(pathname?.match(PEDIDO_DETAIL_PATH)?.[1] ?? 0);
  const { data: folio } = useQuery<PedidoDetail, Error, string | null>({
    queryKey: pedidoDetailQueryKey(id),
    queryFn: () => getPedidoDetail(id),
    enabled: false,
    select: (pedido) => pedido.folio,
  });

  if (id <= 0) return null;
  return folio ? `Pedido ${folio}` : "Pedido";
};
