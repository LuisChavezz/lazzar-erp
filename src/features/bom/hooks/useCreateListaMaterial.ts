import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createListaMaterial } from "../services/actions";
import type { ListaMaterialCreate } from "../interfaces/bom.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedDrfMessage } from "@/src/utils/firstDrfMessage";

export const useCreateListaMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ListaMaterialCreate) => createListaMaterial(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      // `tiene_bom` del selector de variantes (alta de OP) depende de las
      // listas de materiales: sin esto, la variante seguiría como "Sin BOM"
      // hasta que venciera la caché.
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success("Lista de materiales registrada correctamente");
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
      toast.error("Error al registrar la lista de materiales");
    },
  });
};
