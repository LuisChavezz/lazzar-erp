import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { workOrderUpdateErrorMessage } from "@/src/utils/workOrderStatusEdit";

interface UseUpdateWorkOrderOptions<P> {
  /** El `PATCH` del módulo, ya ligado al id de la orden. */
  mutationFn: (data: P) => Promise<void>;
  /** Llave del detalle de ESTA orden. */
  detailQueryKey: QueryKey;
  /** Prefijo del listado del módulo (también alimenta la tarjeta del tablero). */
  listQueryKey: QueryKey;
  /** "orden de reflejante", "orden de corte de manga": copy de los toasts. */
  orderLabel: string;
  /** Toast de éxito, con la mayúscula inicial que `orderLabel` no lleva. */
  successMessage: string;
}

/**
 * Mutación de edición parcial de una orden de reflejante o de corte de manga
 * (`PATCH` de nucleo-erp #755). Cada módulo la envuelve en un hook delgado con
 * su servicio, sus llaves y su copy (`useUpdateReflectiveOrder`,
 * `useUpdateCorteMangaOrder`).
 *
 * Invalida en vez de escribir la caché, porque la respuesta del `PATCH` no
 * tiene la forma del detalle:
 *  - el detalle de esta orden, con la `fecha_fin` que haya sellado el backend;
 *  - el listado del módulo y la tarjeta del tablero de producción, que cuentan
 *    por estatus;
 *  - el detalle y la trazabilidad de los pedidos (`invalidatePedidoProgress`),
 *    que muestran el estatus de sus órdenes de trabajo.
 */
export const useUpdateWorkOrder = <P>({
  mutationFn,
  detailQueryKey,
  listQueryKey,
  orderLabel,
  successMessage,
}: UseUpdateWorkOrderOptions<P>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(successMessage);
    },
    onError: (error) => {
      toast.error(workOrderUpdateErrorMessage(error, orderLabel));
    },
    // También tras un fallo: un `400` por cancelación significa que la ficha
    // en pantalla está vieja (otro usuario la canceló), y releerla la pasa a
    // solo lectura.
    //
    // Se DEVUELVE la promesa: TanStack Query espera a `onSettled` antes de
    // dar la mutación por terminada, así que `isPending` sigue en `true` hasta
    // que el detalle re-consultado llega. Sin eso los controles se rehabilitaban
    // con el estatus VIEJO en pantalla, y un segundo cambio armaba el menú de
    // destinos sobre ese valor. `invalidateQueries` no rechaza si el re-fetch
    // falla, así que un error de red no deja la mutación colgada.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: detailQueryKey }),
        queryClient.invalidateQueries({ queryKey: listQueryKey }),
        invalidatePedidoProgress(queryClient),
      ]),
  });
};
