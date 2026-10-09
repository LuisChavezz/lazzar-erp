import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePurchaseOrder } from "../services/actions";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pk: number) => deletePurchaseOrder(pk),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Orden de compra eliminada correctamente");
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
      toast.error("Error al eliminar la orden de compra");
    },
  });
};
