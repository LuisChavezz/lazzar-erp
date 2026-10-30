import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { updateReflectiveOrder } from "../services/actions";
import { reflectiveOrderDetailQueryKey } from "./useReflectiveOrderDetail";
import type { UpdateReflectiveOrderPayload } from "../interfaces/reflective-order.interface";

/**
 * Mutación de edición parcial de una orden de reflejante
 * (`PATCH /produccion/orden-reflejante/{id}/`). El id se fija al crear el hook;
 * `mutate` recibe solo los campos que cambian (para el estatus, armados por
 * `buildReflectiveStatusPayload`).
 *
 * Invalida en vez de escribir la caché, porque la respuesta no tiene la forma
 * del detalle (ver `updateReflectiveOrder`):
 *  - `["reflective-order-detail", id]` — esta ficha, con la `fecha_fin` que
 *    haya sellado el backend.
 *  - `["reflective-orders"]` — el listado y la tarjeta del tablero de
 *    producción, que cuentan por estatus.
 *  - el detalle y la trazabilidad de los pedidos (`invalidatePedidoProgress`),
 *    que muestran el estatus de sus órdenes de trabajo.
 *
 * El error sale de `drfActionErrorMessage`: el `400` de una orden cancelada
 * llega por campo (`{"estatus_reflejante": ["…"]}`), una forma que
 * `extractErrorMessage` no lee, y un `404` significa que la orden ya no existe
 * o salió del alcance del usuario.
 */
export const useUpdateReflectiveOrder = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateReflectiveOrderPayload) => updateReflectiveOrder(id, data),
    onSuccess: () => {
      toast.success("Orden de reflejante actualizada correctamente");
    },
    onError: (error) => {
      toast.error(
        drfActionErrorMessage(
          error,
          "No se pudo actualizar la orden de reflejante",
          "La orden de reflejante ya no existe o no tienes acceso a ella.",
        ),
      );
    },
    // También tras un fallo: un `400` por cancelación significa que la ficha
    // en pantalla está vieja (otro usuario la canceló), y releerla la pasa a
    // solo lectura.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: reflectiveOrderDetailQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["reflective-orders"] });
      void invalidatePedidoProgress(queryClient);
    },
  });
};
