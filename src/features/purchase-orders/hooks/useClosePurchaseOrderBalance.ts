import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { purchaseOrderReceiptKpisQueryKey } from "@/src/features/purchase-order-receipts/hooks/usePurchaseOrderReceiptKpis";
import { closePurchaseOrderBalance } from "../services/actions";
import { writePurchaseOrderStatus } from "../utils/purchaseOrderStatusCache";
import { invalidateReceiptOrderOptions } from "../utils/invalidateReceiptOrderOptions";

interface UseClosePurchaseOrderBalanceOptions {
  /**
   * Error del backend sobre `motivo`: se entrega aquí EN VEZ de en un toast,
   * para que el diálogo lo pinte bajo su campo (mismo patrón que
   * `useCancelPurchaseOrder`).
   */
  onReasonError?: (message: string) => void;
}

/**
 * Cierra el saldo de una OC parcialmente recibida
 * (`POST /compras/ordenes/{id}/cerrar-saldo/`, EC-947).
 *
 * Mismo esquema que `useCancelPurchaseOrder`: escribe en la fila y el detalle
 * los campos del cierre ANTES de invalidar (EC-927), e invalida
 * `["purchase-orders"]` al terminar, con éxito o con error (un 400 de
 * `estatus` dice que la fila en caché está vieja). Al cerrarse, la OC deja de
 * ser recibible y lo que faltaba de sus necesidades vuelve a Pendiente: se
 * releen las opciones de recepción, las necesidades y las pre-órdenes.
 *
 * Errores: toast con el mensaje del backend tal cual (`403` con su `detail`,
 * `400` de `estatus` o `recepciones`), salvo el de `motivo` con `onReasonError`.
 */
export const useClosePurchaseOrderBalance = ({ onReasonError }: UseClosePurchaseOrderBalanceOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closePurchaseOrderBalance,
    onSuccess: async (response) => {
      await writePurchaseOrderStatus(queryClient, response, [
        "estatus",
        "estatus_label",
        "saldo_cerrado",
        "motivo_cierre",
        "fecha_cierre",
      ]);
      queryClient.invalidateQueries({ queryKey: ["purchase-order-onboarding"] });
      invalidateReceiptOrderOptions(queryClient);
      queryClient.invalidateQueries({ queryKey: purchaseOrderReceiptKpisQueryKey });
      queryClient.invalidateQueries({ queryKey: ["purchase-needs"] });
      queryClient.invalidateQueries({ queryKey: ["pre-orders"] });
      queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
      toast.success("Saldo de la orden de compra cerrado");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (error) => {
      const reasonMessage = drfFieldMessage(error, "motivo");
      if (reasonMessage && onReasonError) {
        onReasonError(reasonMessage);
        return;
      }
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "Error al cerrar el saldo de la orden de compra"),
      );
    },
  });
};
