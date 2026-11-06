import type { QueryClient } from "@tanstack/react-query";
import { invalidateScheduledPedidos } from "@/src/features/picking/hooks/useScheduledPedidos";
import { ORDERS_QUERY_KEY } from "../constants/ordersQueryKeys";
import { PEDIDO_KPIS_QUERY_KEY } from "../constants/pedidoKpis";
import { invalidatePedidoProgress } from "./invalidatePedidoProgress";

/**
 * Invalida los LISTADOS de pedidos y sus indicadores: todo lo que cuelga de
 * `["orders"]` (Mesa de Control, Programados, Mis pedidos, los selectores y
 * `kpis-mesa`) más `["pedido-kpis"]`, que va fuera de ese prefijo y suma
 * `gran_total`. Es lo que cambia cuando nace un pedido (autorizar).
 */
export const invalidatePedidoLists = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: PEDIDO_KPIS_QUERY_KEY }),
  ]);

/**
 * Regla ÚNICA para una mutación que REESCRIBE los renglones, servicios extras
 * y totales de un pedido existente: `aceptar-cambios` (mesa de control) y
 * `editar-mesa-control`. Los listados y sus indicadores (`invalidatePedidoLists`),
 * el detalle, la trazabilidad y "Programar pedido" (`invalidatePedidoProgress`,
 * por raíz) y los pedidos programados (Pedidos de Almacén y el Paso 1 de Nuevo
 * Surtido), cuyas piezas cambian con los renglones.
 *
 * No lleva id: `invalidatePedidoProgress` invalida por raíz, así que también
 * sirve cuando no se sabe qué pedido cambió (una respuesta que no llegó).
 *
 * "Programar pedido" (`PATCH .../programar/`) NO es de este grupo: solo
 * reescribe `programacion_conf`, no renglones ni totales.
 */
export const invalidatePedidoLinesRewritten = (queryClient: QueryClient) =>
  Promise.all([
    invalidatePedidoLists(queryClient),
    invalidatePedidoProgress(queryClient),
    invalidateScheduledPedidos(queryClient),
  ]);
