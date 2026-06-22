import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createListaMaterial } from "../services/actions";
import type { ListaMaterialCreate } from "../interfaces/bom.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useCreateListaMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ListaMaterialCreate) => createListaMaterial(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      toast.success("Lista de materiales registrada correctamente");
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
      toast.error("Error al registrar la lista de materiales");
    },
  });
};
