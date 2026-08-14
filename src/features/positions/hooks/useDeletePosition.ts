import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePosition } from "../services/actions";
import toast from "react-hot-toast";
import { Position } from "../interfaces/position.interface";

export const useDeletePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePosition,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["positions"] });
      const previousPositions = queryClient.getQueryData<Position[]>(["positions"]);

      if (previousPositions) {
        queryClient.setQueryData<Position[]>(["positions"], (old) =>
          old ? old.filter((position) => position.id !== id) : []
        );
      }

      return { previousPositions };
    },
    onError: (err, id, context) => {
      if (context?.previousPositions) {
        queryClient.setQueryData(["positions"], context.previousPositions);
      }
      console.error(err);
      toast.error("Error al eliminar el puesto");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
    onSuccess: () => {
      toast.success("Puesto eliminado correctamente");
    },
  });
};
