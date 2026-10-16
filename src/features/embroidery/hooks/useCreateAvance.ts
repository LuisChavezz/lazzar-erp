import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { createAvance } from "../services/actions";
import { embroideryOrderDetailQueryKey } from "./useEmbroideryOrderDetail";

interface UseCreateAvanceOptions {
  /** Pedido madre de la OB, o `null` si no tiene. */
  pedidoId: number | null;
}

/**
 * Mutación de alta de un avance de bordado
 * (`POST /produccion/bordado-avances/`). La OB padre viaja en el payload
 * (`variables.ob`).
 *
 * Invalida solo a quien LEE avances:
 *  - `["embroidery-order-detail", ob]` — `avances` y `resumen_avance` viven
 *    SOLO en el detalle; su re-fetch muestra el avance y el resumen
 *    recalculado.
 *  - `["pedido-trazabilidad", pedidoId]` — la trazabilidad del pedido suma
 *    `cantidad_bordada` de los avances activos de sus OB.
 *
 * El listado (`["embroidery-orders"]`) NO se invalida: no pinta ningún dato
 * derivado de los avances.
 */
export const useCreateAvance = ({ pedidoId }: UseCreateAvanceOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvance,
    onSuccess: (_avance, variables) => {
      queryClient.invalidateQueries({
        queryKey: embroideryOrderDetailQueryKey(variables.ob),
      });
      if (pedidoId !== null) {
        queryClient.invalidateQueries({
          queryKey: pedidoTrazabilidadQueryKey(pedidoId),
        });
      }
      toast.success("Avance registrado correctamente");
    },
    onError: (error) => {
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "No se pudo registrar el avance")
      );
    },
  });
};
