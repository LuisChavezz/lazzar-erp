import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateEmbroideryOrder } from "../services/actions";
import { embroideryOrderDetailQueryKey } from "./useEmbroideryOrderDetail";
import { parseEmbroideryUpdateError } from "../utils/parseEmbroideryUpdateError";
import type { UpdateEmbroideryOrderPayload } from "../interfaces/embroidery.interface";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Mutación de edición parcial de una orden de bordado
 * (`PATCH /produccion/orden-bordado/{id}/`). El id de la orden se fija al crear
 * el hook; `mutate` recibe solo los campos que cambian.
 *
 * Invalida DOS llaves:
 *  - `["embroidery-order-detail", id]` — el detalle de ESTA orden, para que el
 *    re-fetch traiga los `avances`/`resumen_avance` y demás campos recalculados
 *    por el backend.
 *  - `["embroidery-orders"]` — el listado, donde `estatus_bordado`/`prioridad`/
 *    `maquina_asignada`/`proveedor` de la fila cambian.
 */
export const useUpdateEmbroideryOrder = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UpdateEmbroideryOrderPayload>) =>
      updateEmbroideryOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: embroideryOrderDetailQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["embroidery-orders"] });
      void invalidatePedidoProgress(queryClient);
      toast.success("Orden de bordado actualizada correctamente");
    },
    // `parseEmbroideryUpdateError` y no `extractErrorMessage` a secas: este
    // endpoint rechaza POR CAMPO (`{"proveedor": ["…"]}`), una forma que el
    // helper compartido no lee — dejaba el toast en "Request failed with status
    // code 400".
    onError: (error) => {
      toast.error(parseEmbroideryUpdateError(error));
    },
  });
};
