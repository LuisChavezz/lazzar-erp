import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { createAvance } from "../services/actions";
import { embroideryOrderDetailQueryKey } from "./useEmbroideryOrderDetail";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Mutación de alta de un avance de bordado
 * (`POST /produccion/bordado-avances/`). La OB padre viaja en el payload
 * (`variables.ob`), así que el hook no necesita un parámetro aparte.
 *
 * Invalida `["embroidery-order-detail", ob]`: los `avances` y el
 * `resumen_avance` viven SOLO en el detalle. La invalidación se DEVUELVE para
 * que la mutación siga en `isPending` hasta que llegue el re-fetch: el tope del
 * diálogo sale de `resumen_avance`, y sin esperar, reabrirlo antes de que
 * llegara el detalle nuevo dejaría registrar contra el total viejo (el backend
 * no impone el tope).
 *
 * No invalida el listado (no pinta datos de avance). El pedido, con
 * `invalidatePedidoProgress`, como toda mutación que cambia su avance.
 */
export const useCreateAvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvance,
    onSuccess: (_avance, variables) => {
      toast.success("Avance registrado correctamente");
      // Se espera solo el detalle de la OB: su `resumen_avance` es el tope del
      // diálogo. El pedido, sin esperar (ver `invalidatePedidoProgress`).
      void invalidatePedidoProgress(queryClient);
      return queryClient.invalidateQueries({
        queryKey: embroideryOrderDetailQueryKey(variables.ob),
      });
    },
    onError: (error) => {
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "No se pudo registrar el avance")
      );
    },
  });
};
