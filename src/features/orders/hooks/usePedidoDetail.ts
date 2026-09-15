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
interface UsePedidoDetailOptions {
  /**
   * `"always"` fuerza la lectura al montar aunque la caché siga fresca
   * (`staleTime` global de 15 min). Lo usa "Programar pedido": su guardado
   * REEMPLAZA la lista entera, así que precargarla de una caché vieja borraría
   * en silencio lo que otro usuario programó mientras tanto.
   */
  refetchOnMount?: boolean | "always";
}

export const usePedidoDetail = (id: number, options: UsePedidoDetailOptions = {}) => {
  return useQuery<PedidoDetail>({
    queryKey: ["pedido-detail", id],
    queryFn: () => getPedidoDetail(id),
    enabled: id > 0,
    // Spread condicional: un `refetchOnMount: undefined` explícito pisaría el
    // default del QueryClient para los consumidores que no pasan la opción.
    ...(options.refetchOnMount !== undefined ? { refetchOnMount: options.refetchOnMount } : {}),
  });
};
