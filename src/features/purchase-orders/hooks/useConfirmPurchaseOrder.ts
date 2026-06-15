import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPurchaseOrder } from "../services/actions";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useConfirmPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ordenCompraId: number) => confirmPurchaseOrder(ordenCompraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      toast.success("Orden de compra confirmada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;
          const firstMessage = Object.values(validationErrors).flat()[0];
          if (firstMessage) {
            toast.error(firstMessage);
            return;
          }
        }
      }
      toast.error("Error al confirmar la orden de compra");
    },
  });
};
