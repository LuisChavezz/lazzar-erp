import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePurchaseOrder } from "../services/actions";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pk: number) => deletePurchaseOrder(pk),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Orden de compra eliminada correctamente");
    },
    onError: (error) => toastDrfError(error, "Error al eliminar la orden de compra"),
  });
};
