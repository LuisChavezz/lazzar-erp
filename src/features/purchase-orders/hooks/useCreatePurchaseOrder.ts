import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPurchaseOrder } from "../services/actions";
import { PurchaseOrderCreate } from "../interfaces/purchase-order.interface";
import toast from "react-hot-toast";

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseOrder: PurchaseOrderCreate) =>
      createPurchaseOrder(purchaseOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Orden de compra creada correctamente");
    },
    onError: () => {
      toast.error("Error al crear la orden de compra");
    },
  });
};
