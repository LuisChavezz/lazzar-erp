import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePurchaseOrder } from "../services/actions";
import type { UpdatePurchaseOrderParams } from "../interfaces/purchase-order.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pk, body }: UpdatePurchaseOrderParams) =>
      updatePurchaseOrder({ pk, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      toast.success("Orden de compra actualizada correctamente");
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
      toast.error("Error al actualizar la orden de compra");
    },
  });
};
