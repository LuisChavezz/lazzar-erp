import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSize } from "../services/actions";
import toast from "react-hot-toast";
import { Size } from "../interfaces/size.interface";

export const useDeleteSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSize,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["sizes"] });
      const previousSizes = queryClient.getQueryData<Size[]>(["sizes"]);

      if (previousSizes) {
        queryClient.setQueryData<Size[]>(["sizes"], (old) =>
          old ? old.filter((size) => size.id !== id) : []
        );
      }

      return { previousSizes };
    },
    onError: (err, id, context) => {
      if (context?.previousSizes) {
        queryClient.setQueryData(["sizes"], context.previousSizes);
      }
      console.error(err);
      toast.error("Error al eliminar la talla");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
    },
    onSuccess: () => {
      toast.success("Talla eliminada correctamente");
    },
  });
};
