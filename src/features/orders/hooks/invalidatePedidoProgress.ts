import type { QueryClient } from "@tanstack/react-query";
import { PEDIDO_PROGRAMAR_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { PEDIDO_DETAIL_QUERY_ROOT } from "./usePedidoDetail";
import { PEDIDO_TRAZABILIDAD_QUERY_ROOT } from "./usePedidoTrazabilidad";

/**
 * Invalida el detalle (`["pedido-detail", id]`), la trazabilidad
 * (`["pedido-trazabilidad", id]`) y el contexto de "Programar pedido"
 * (`["pedido-programar", id]`) de TODOS los pedidos en caché, por raíz.
 *
 * La llaman las mutaciones de otros módulos que cambian el avance de un pedido
 * (picking, packing, envío, órdenes de trabajo, avances, facturas, notas de
 * crédito…). Por raíz y no por id porque no todas las respuestas ni payloads
 * traen el pedido, y porque es barato: una invalidación solo vuelve a pedir las
 * consultas montadas y deja las demás marcadas como viejas para su próximo
 * montaje. Así la regla es la misma en todas esas mutaciones y no depende de
 * que cada consumidor de `usePedidoDetail` relea al montarse.
 *
 * Devuelve la promesa por si una mutación quiere esperarla; las actuales no lo
 * hacen.
 */
export const invalidatePedidoProgress = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: [PEDIDO_DETAIL_QUERY_ROOT] }),
    queryClient.invalidateQueries({ queryKey: [PEDIDO_TRAZABILIDAD_QUERY_ROOT] }),
    queryClient.invalidateQueries({ queryKey: PEDIDO_PROGRAMAR_QUERY_KEY }),
  ]);
