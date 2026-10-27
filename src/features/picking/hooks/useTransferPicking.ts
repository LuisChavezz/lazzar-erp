import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";
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

/** Mensaje para un 403: el backend exige `C-WMS-PICKING` para trasladar. */
const TRANSFER_FORBIDDEN_MESSAGE = "No tienes permiso para trasladar surtidos.";

/**
 * Mensaje de un error del traslado para el banner del diálogo, o `null` si no
 * hay nada que poner en él.
 *
 * - Un 400 cuyo cuerpo es un ARREGLO suelto (`["Inventario insuficiente…"]`,
 *   `["No hay existencia…"]`): lo levanta la transferencia que crea el
 *   traslado, sin campo. Su primer mensaje va al banner tal cual.
 * - Un 403 (sin `C-WMS-PICKING`; el backend lo comprueba desde #700): su
 *   `detail` o, si no trae texto, un mensaje fijo, al banner.
 * - Un 400 cuyo ÚNICO campo con mensaje es `almacen` (mismo almacén, otra
 *   empresa o sucursal, inactivo, "no permite entradas" o un id inválido) va
 *   bajo el selector vía `setFieldError` y devuelve `null`.
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
  if (error instanceof AxiosError && error.response?.status === 403) {
    const detail = (error.response.data as Record<string, unknown> | undefined)?.detail;
    return firstDrfMessage(detail) ?? TRANSFER_FORBIDDEN_MESSAGE;
  }
  const data =
    error instanceof AxiosError && error.response?.status === 400 ? error.response.data : undefined;
  if (Array.isArray(data)) {
    return firstDrfMessage(data) ?? TRANSFER_FALLBACK;
  }
  if (data && typeof data === "object") {
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
 * por registro (mismo patrón que `useChangeProductionOrderStatus`). El traslado
 * crea una transferencia (folio TR) COMPLETADA que mueve las existencias del
 * almacén actual al nuevo. Sin escritura optimista; al terminar bien:
 *
 * - la respuesta (forma idéntica al detalle y a cada fila del listado) se
 *   escribe en `["picking-detail", id]` —lo que pinta `PickingDetailByIdDialog`—
 *   y en su fila de `["pickings"]` —de la que lee el detalle abierto desde el
 *   listado—, para que ambos muestren la ubicación nueva sin esperar al refetch;
 * - se invalidan igual la lista, el detalle y la trazabilidad de los pedidos
 *   (`folios_picking` trae la ubicación actual), el onboarding de empaque
 *   (hereda el `almacen_nombre` del picking) y, porque se movió inventario, los
 *   traspasos (`["transferencias"]`), toda vista de existencias y el onboarding
 *   de picking (`["picking-onboarding"]`, que muestra existencias por almacén)
 *   — lo mismo que invalida `useCreatePicking`, que también crea una TR.
 *
 * Errores:
 * - 404 (el surtido ya no existe o no hay acceso): se avisa con `toast.error`,
 *   porque al refrescar desaparece el detalle y con él el diálogo; quien llama
 *   lo cierra.
 * - 400 `estado` (ya se completó, canceló o tiene líneas surtidas): se refresca
 *   el surtido para que la acción deje de ofrecerse; el mensaje lo pinta el
 *   diálogo, que sigue abierto.
 * - El resto (403 incluido) lo pinta el diálogo (`parseTransferPickingError`),
 *   sin toast.
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
      void invalidatePedidoProgress(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["packing-onboarding"] });
      void queryClient.invalidateQueries({ queryKey: ["picking-onboarding"] });
      void queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      void invalidateStockQueries(queryClient);
      // Sin líneas que mover el backend no crea TR (`transferencia_folio` nulo).
      toast.success(
        picking.transferencia_folio
          ? `Surtido trasladado a ${picking.almacen_actual_nombre} (traspaso ${picking.transferencia_folio})`
          : `Surtido trasladado a ${picking.almacen_actual_nombre}`,
      );
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
