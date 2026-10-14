import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postPurchaseOrder } from "../services/actions";
import { purchaseOrderReceiptKpisQueryKey } from "@/src/features/purchase-order-receipts/hooks/usePurchaseOrderReceiptKpis";
import type { PurchaseOrderOnboardingPayload } from "../interfaces/purchase-order-onboarding.interface";
import {
  readPurchaseOrderHeaderErrors,
  type PurchaseOrderHeaderFieldErrors,
} from "../utils/purchaseOrderHeaderErrors";
import toast from "react-hot-toast";

interface UsePostPurchaseOrderOptions {
  /**
   * Se llama (además del toast) cuando el backend rechaza campos del
   * encabezado (`referencia`, `tipo_compra`, `pedidos`…), para que el llamador
   * los muestre bajo su campo. Solo puede ocurrir en el POST del encabezado:
   * el de los renglones (`orden_compra_id` + `detalle`) no lleva encabezado.
   */
  onHeaderFieldErrors?: (errors: PurchaseOrderHeaderFieldErrors) => void;
}

export const usePostPurchaseOrder = ({
  onHeaderFieldErrors,
}: UsePostPurchaseOrderOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PurchaseOrderOnboardingPayload) =>
      postPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      // Indicadores de Recepciones: cuentan OCs y sus cantidades ordenadas.
      queryClient.invalidateQueries({ queryKey: purchaseOrderReceiptKpisQueryKey });
    },
    onError: (error) => {
      const { fieldErrors, toastMessage } = readPurchaseOrderHeaderErrors(
        error,
        "Error al registrar la orden de compra",
      );
      toast.error(toastMessage);
      if (Object.keys(fieldErrors).length > 0) {
        onHeaderFieldErrors?.(fieldErrors);
      }
    },
  });
};
