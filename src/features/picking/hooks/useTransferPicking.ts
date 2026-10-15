import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { handleDrfWriteError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { transferPicking } from "../services/actions";
import type { Picking, TransferPickingPayload } from "../interfaces/picking.interface";

/** Único campo del formulario de traslado al que el backend atribuye errores. */
export type TransferPickingField = "almacen";

const TRANSFER_FIELDS: readonly TransferPickingField[] = ["almacen"];

const TRANSFER_FALLBACK = "No se pudo trasladar el surtido.";

/**
 * Mensaje de un error del traslado para el banner del diálogo. Un 400 `almacen`
 * (mismo almacén, otra empresa o sucursal, "no permite salidas" o un id
 * inválido) va bajo el selector vía `setFieldError` y NO vuelve como mensaje;
 * lo demás (`estado`, `picking`, 404, red, 5xx) sí, para el banner.
 */
export function parseTransferPickingError(
  error: unknown,
  setFieldError: (field: TransferPickingField, message: string) => void,
): string | null {
  if (isNotFoundError(error)) {
    return "Este surtido ya no existe o ya no tienes acceso a él.";
  }
  let fieldError = false;
  const message = handleDrfWriteError(error, TRANSFER_FALLBACK, TRANSFER_FIELDS, (field, text) => {
    fieldError = true;
    setFieldError(field, text);
  });
  // `handleDrfWriteError` devuelve el respaldo cuando el único error era de un
  // campo visible: ya está bajo el selector, no hace falta repetirlo arriba.
  return fieldError && message === TRANSFER_FALLBACK ? null : message;
}

/** ¿El rechazo dice que el surtido ya cambió en el servidor (estatus o existencia)? */
const isStalePickingError = (error: unknown): boolean => {
  if (isNotFoundError(error)) return true;
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return false;
  const data = error.response.data;
  return Boolean(data && typeof data === "object" && "estado" in data);
};

/**
 * `POST /wms/pickings/{id}/trasladar/` para UN picking. La llave de mutación es
 * por registro (mismo patrón que `useChangeProductionOrderStatus`). Sin
 * escritura optimista; al terminar bien:
 *
 * - la respuesta (forma idéntica al detalle) se escribe en
 *   `["picking-detail", id]`, que es lo que pinta `PickingDetailByIdDialog`;
 * - se invalidan la lista `["pickings"]` (de la que lee el detalle abierto desde
 *   el listado), el detalle del pedido (`folios_picking` trae el almacén
 *   origen) y el onboarding de empaque (hereda el `almacen_nombre` del
 *   picking).
 *
 * Un rechazo que dice que el surtido cambió por otro lado (404, o 400 `estado`
 * porque ya se completó o canceló) refresca la lista y el detalle para que la
 * acción deje de ofrecerse. Los mensajes de error los muestra quien llama
 * (`parseTransferPickingError`), en su diálogo.
 */
export const useTransferPicking = (pickingId: number) => {
  const queryClient = useQueryClient();

  const refreshPicking = () => {
    void queryClient.invalidateQueries({ queryKey: ["pickings"] });
    void queryClient.invalidateQueries({ queryKey: ["picking-detail", pickingId] });
  };

  return useMutation({
    mutationKey: ["picking-transfer", pickingId],
    mutationFn: (payload: TransferPickingPayload) => transferPicking(pickingId, payload),
    onSuccess: (picking: Picking) => {
      queryClient.setQueryData<Picking>(["picking-detail", pickingId], picking);
      void queryClient.invalidateQueries({ queryKey: ["pickings"] });
      void queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(picking.pedido) });
      void queryClient.invalidateQueries({ queryKey: ["packing-onboarding"] });
      toast.success(`Surtido trasladado a ${picking.almacen_nombre}`);
    },
    onError: (error) => {
      if (isStalePickingError(error)) refreshPicking();
    },
  });
};
