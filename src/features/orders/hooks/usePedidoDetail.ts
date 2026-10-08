import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
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

export const pedidoDetailQueryKey = (id: number) => ["pedido-detail", id] as const;

export const usePedidoDetail = (id: number, options: UsePedidoDetailOptions = {}) => {
  return useQuery<PedidoDetail>({
    queryKey: pedidoDetailQueryKey(id),
    queryFn: () => getPedidoDetail(id),
    enabled: id > 0,
    // Spread condicional: un `refetchOnMount: undefined` explícito pisaría el
    // default del QueryClient para los consumidores que no pasan la opción.
    ...(options.refetchOnMount !== undefined ? { refetchOnMount: options.refetchOnMount } : {}),
  });
};

/**
 * `usePedidoDetail` con el patrón `useHasLoadedQuery`, para la PÁGINA del
 * detalle 360° (`PedidoDetailContent`): un refetch fallido con datos en caché
 * (p. ej. la relectura tras guardar un editor de la cabecera) conserva la página
 * y avisa por toast; solo un fallo sin datos (`isInitialError`) la cambia por el
 * estado de error.
 *
 * Es un hook aparte y no un cambio en `usePedidoDetail` porque sus otros
 * consumidores (Programar pedido, edición de Mesa de Control, el detalle desde
 * picking) exigen datos leídos en ESA apertura y pintan su propio error en
 * línea: un toast compartido les duplicaría el aviso.
 *
 * `refetchOnMount: "always"`, igual que la trazabilidad: la hoja de Avances
 * pinta lado a lado el paso "Asignado" (trazabilidad) y la barra "Avance
 * asignado" (`tracker_picking` de ESTE detalle), que miden lo mismo. Si solo una
 * se releyera al abrir, un picking creado en otra pantalla (que no invalida el
 * detalle) las dejaría con cifras distintas durante el `staleTime` de 15 min.
 */
export const usePedidoDetailPage = (id: number) => {
  const { data, isLoading, isError, isFetching, error, errorUpdatedAt, refetch } =
    usePedidoDetail(id, { refetchOnMount: "always" });

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "pedido-detail-refetch-error",
    errorMessage: "No se pudo actualizar el pedido. Mostrando datos anteriores.",
  });

  return { data, hasLoaded, isInitialError, isLoading, isFetching, error, refetch };
};
