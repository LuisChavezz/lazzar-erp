import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteArea } from "../services/actions";
import toast from "react-hot-toast";
import { Area } from "../interfaces/area.interface";

export const useDeleteArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArea,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["areas"] });
      const previousAreas = queryClient.getQueryData<Area[]>(["areas"]);

      if (previousAreas) {
        queryClient.setQueryData<Area[]>(["areas"], (old) =>
          old ? old.filter((area) => area.id !== id) : []
        );
      }

      return { previousAreas };
    },
    onError: (err, id, context) => {
      if (context?.previousAreas) {
        queryClient.setQueryData(["areas"], context.previousAreas);
      }
      console.error(err);
      toast.error("Error al eliminar el área");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
    onSuccess: () => {
      toast.success("Área eliminada correctamente");
    },
  });
};
