import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPurchaseOrder } from "../services/actions";
import { invalidateReceiptOrderOptions } from "../utils/invalidateReceiptOrderOptions";
import { purchaseOrderReceiptKpisQueryKey } from "@/src/features/purchase-order-receipts/hooks/usePurchaseOrderReceiptKpis";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";

export const useConfirmPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ordenCompraId: number) => confirmPurchaseOrder(ordenCompraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      // Confirmada = autorizada = recibible: debe aparecer en el alta de recepción.
      invalidateReceiptOrderOptions(queryClient);
      // Autorizada entra al cumplimiento de cantidad de Recepciones.
      queryClient.invalidateQueries({ queryKey: purchaseOrderReceiptKpisQueryKey });
      toast.success("Orden de compra confirmada correctamente");
    },
    onError: (error) => toastDrfError(error, "Error al confirmar la orden de compra"),
  });
};
