import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteColor } from "../services/actions";
import toast from "react-hot-toast";
import { Color } from "../interfaces/color.interface";

export const useDeleteColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteColor,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["colors"] });
      const previousColors = queryClient.getQueryData<Color[]>(["colors"]);

      if (previousColors) {
        queryClient.setQueryData<Color[]>(["colors"], (old) =>
          old ? old.filter((color) => color.id !== id) : []
        );
      }

      return { previousColors };
    },
    onError: (err, id, context) => {
      if (context?.previousColors) {
        queryClient.setQueryData(["colors"], context.previousColors);
      }
      console.error(err);
      toast.error("Error al eliminar el color");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["colors"] });
    },
    onSuccess: () => {
      toast.success("Color eliminado correctamente");
    },
  });
};
