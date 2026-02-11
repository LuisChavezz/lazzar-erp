import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCurrency } from "../services/actions";
import toast from "react-hot-toast";

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Moneda eliminada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Error al eliminar la moneda");
    },
  });
};
