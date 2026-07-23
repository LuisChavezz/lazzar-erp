import { useQuery } from "@tanstack/react-query";
import { getPedidoDetail } from "../services/actions";
import type { PedidoDetail } from "../interfaces/order.interface";

/**
 * Lee el detalle de UN pedido (`GET /ventas/pedidos/{id}/`), con sus líneas
 * producto+color y tallas anidadas.
 *
 * `id: number` con `0` como centinela de "sin selección" (`enabled: id > 0`)
 * — mismo patrón que `useTransferenciaDetail`. El consumidor monta el diálogo
 * solo al abrirlo (ver `PickingOrderDetailDialog`) y SIEMPRE con un id real,
 * así que `enabled` es la segunda barrera, no la única: seleccionar un pedido
 * en un formulario no dispara ninguna petición de detalle.
 *
 * Llave con namespace propio (`["pedido-detail", id]`), NO colgada del prefijo
 * `["orders"]` del listado — mismo razonamiento que `useTransferenciaDetail`.
 * Primer consumidor de este endpoint en el proyecto; módulos futuros (p. ej.
 * traspasos) pueden reusar este hook tal cual.
 */
export const usePedidoDetail = (id: number) => {
  return useQuery<PedidoDetail>({
    queryKey: ["pedido-detail", id],
    queryFn: () => getPedidoDetail(id),
    enabled: id > 0,
  });
};
