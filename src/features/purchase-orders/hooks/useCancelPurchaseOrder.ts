import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { AxiosError } from "axios";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { cancelPurchaseOrder } from "../services/actions";

/**
 * Error del backend sobre el CAMPO `motivo_cancelacion`, si lo hay. El 400
 * confirmado llega como `{ "motivo_cancelacion": "…" }` (string plano, no
 * array); `firstDrfMessage` acepta ambas formas.
 *
 * Exportado para que el diálogo lo pinte bajo el textarea en vez de en un
 * toast: es un error del campo, no de la acción.
 */
export const cancelReasonFieldError = (error: unknown): string | undefined => {
  const data = (error as AxiosError)?.response?.data;
  if (!data || typeof data !== "object") return undefined;
  return firstDrfMessage((data as Record<string, unknown>).motivo_cancelacion);
};

/**
 * Cancela una orden de compra (`POST /compras/ordenes/{id}/cancelar/`).
 *
 * Invalida lo mismo que `useConfirmPurchaseOrder`: `["purchase-orders"]` (por
 * prefijo también el detalle `["purchase-orders", id]`) y el onboarding de
 * OC. La orden cancelada NO desaparece: vuelve en el listado con estatus 6.
 *
 * Errores: un error de `motivo_cancelacion` NO se notifica con toast —lo
 * muestra el diálogo en el campo—. El resto (p. ej. `{ "estatus": "La orden ya
 * no puede cancelarse." }`) sale en toast con el mensaje del backend vía
 * `firstDrfFieldMessage`, con `extractErrorMessage` de respaldo.
 */
export const useCancelPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      toast.success("Orden de compra cancelada correctamente");
    },
    onError: (error) => {
      if (cancelReasonFieldError(error)) return;
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "Error al cancelar la orden de compra"),
      );
    },
  });
};
