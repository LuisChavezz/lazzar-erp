import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postPurchaseOrder } from "../services/actions";
import type { PurchaseOrderOnboardingPayload } from "../interfaces/purchase-order-onboarding.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const usePostPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PurchaseOrderOnboardingPayload) =>
      postPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
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
      toast.error("Error al registrar la orden de compra");
    },
  });
};
