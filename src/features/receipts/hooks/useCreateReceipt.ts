import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReceipt } from "../services/actions";
import type { ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedDrfMessage } from "@/src/utils/firstDrfMessage";

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReceiptCreatePayload) => createReceipt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
      // La recepción cambia el estatus de la OC (parcial/recibida): listado,
      // detalle e historial por proveedor cuelgan de este prefijo.
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Recepción registrada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const firstMessage = firstNestedDrfMessage(data);
          if (firstMessage) {
            toast.error(firstMessage);
            return;
          }
        }
      }
      toast.error("Error al registrar la recepción");
    },
  });
};
