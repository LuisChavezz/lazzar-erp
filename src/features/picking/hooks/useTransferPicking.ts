import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { handleDrfWriteError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { transferPicking } from "../services/actions";
import type { Picking, TransferPickingPayload } from "../interfaces/picking.interface";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/** Único campo del formulario de traslado al que el backend atribuye errores. */
export type TransferPickingField = "almacen";

const TRANSFER_FIELDS: readonly TransferPickingField[] = ["almacen"];

const TRANSFER_FALLBACK = "No se pudo trasladar el surtido.";

/** Mensaje para un 404: el surtido ya no existe o el usuario perdió acceso. */
const TRANSFER_NOT_FOUND_MESSAGE = "Este surtido ya no existe o ya no tienes acceso a él.";

/**
 * Mensaje de un error del traslado para el banner del diálogo, o `null` si no
 * hay nada que poner en él.
 *
 * - Un 400 cuyo ÚNICO campo con mensaje es `almacen` (mismo almacén, otra
 *   empresa o sucursal, "no permite salidas" o un id inválido) va bajo el
 *   selector vía `setFieldError` y devuelve `null`.
 * - Cualquier otro error (`estado`, `picking`, red, 5xx) va al banner, con el
 *   mensaje de `handleDrfWriteError` (que también pinta `almacen` si viene).
 *
 * El 404 no pasa por aquí: el surtido desaparece y con él el diálogo, así que
 * lo avisa `useTransferPicking` con un toast.
 */
export function parseTransferPickingError(
  error: unknown,
  setFieldError: (field: TransferPickingField, message: string) => void,
): string | null {
  const data =
    error instanceof AxiosError && error.response?.status === 400 ? error.response.data : undefined;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const keysWithMessage = Object.entries(data as Record<string, unknown>)
      .filter(([, value]) => firstDrfMessage(value))
      .map(([key]) => key);
    const almacenMessage = firstDrfMessage((data as Record<string, unknown>).almacen);
    if (almacenMessage && keysWithMessage.length === 1) {
      setFieldError("almacen", almacenMessage);
      return null;
    }
  }
  return handleDrfWriteError(error, TRANSFER_FALLBACK, TRANSFER_FIELDS, setFieldError);
}

/** ¿El rechazo dice que el surtido cambió de estatus en el servidor? */
const isEstadoRejection = (error: unknown): boolean => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return false;
  const data = error.response.data;
  return Boolean(data && typeof data === "object" && "estado" in data);
};

/**
 * `POST /wms/pickings/{id}/trasladar/` para UN picking. La llave de mutación es
 * por registro (mismo patrón que `useChangeProductionOrderStatus`). Sin
 * escritura optimista; al terminar bien:
 *
 * - la respuesta (forma idéntica al detalle y a cada fila del listado) se
 *   escribe en `["picking-detail", id]` —lo que pinta `PickingDetailByIdDialog`—
 *   y en su fila de `["pickings"]` —de la que lee el detalle abierto desde el
 *   listado—, para que ambos muestren el almacén nuevo sin esperar al refetch;
 * - se invalidan igual la lista, el detalle del pedido (`folios_picking` trae
 *   el almacén origen) y el onboarding de empaque (hereda el `almacen_nombre`
 *   del picking).
 *
 * Errores:
 * - 404 (el surtido ya no existe o no hay acceso): se avisa con `toast.error`,
 *   porque al refrescar desaparece el detalle y con él el diálogo; quien llama
 *   lo cierra.
 * - 400 `estado` (ya se completó o canceló): se refresca el surtido para que la
 *   acción deje de ofrecerse; el mensaje lo pinta el diálogo, que sigue abierto.
 * - El resto lo pinta el diálogo (`parseTransferPickingError`), sin toast.
 */
export const useTransferPicking = (pickingId: number) => {
  const queryClient = useQueryClient();

  const refreshPicking = () => {
    void queryClient.invalidateQueries({ queryKey: ["pickings"] });
    void queryClient.invalidateQueries({ queryKey: ["picking-detail", pickingId] });
    // El pedido también lista sus folios de surtido.
    void invalidatePedidoProgress(queryClient);
  };

  return useMutation({
    mutationKey: ["picking-transfer", pickingId],
    mutationFn: (payload: TransferPickingPayload) => transferPicking(pickingId, payload),
    onSuccess: (picking: Picking) => {
      queryClient.setQueryData<Picking>(["picking-detail", pickingId], picking);
      queryClient.setQueryData<Picking[]>(["pickings"], (list) =>
        list?.map((item) => (item.id === picking.id ? picking : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["pickings"] });
      void queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(picking.pedido) });
      void queryClient.invalidateQueries({ queryKey: ["packing-onboarding"] });
      toast.success(`Surtido trasladado a ${picking.almacen_nombre}`);
    },
    onError: (error) => {
      if (isNotFoundError(error)) {
        toast.error(TRANSFER_NOT_FOUND_MESSAGE);
        refreshPicking();
      } else if (isEstadoRejection(error)) {
        refreshPicking();
      }
    },
  });
};
