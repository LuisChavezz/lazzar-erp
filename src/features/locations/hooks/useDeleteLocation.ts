import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLocation } from "../services/actions";
import toast from "react-hot-toast";
import { Location } from "../interfaces/location.interface";

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLocation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["locations"] });
      const previousLocations = queryClient.getQueryData<Location[]>(["locations"]);

      if (previousLocations) {
        queryClient.setQueryData<Location[]>(["locations"], (old) =>
          old ? old.filter((location) => location.id_ubicacion !== id) : []
        );
      }

      return { previousLocations };
    },
    onError: (err, id, context) => {
      if (context?.previousLocations) {
        queryClient.setQueryData(["locations"], context.previousLocations);
      }
      console.error(err);
      toast.error("Error al eliminar la ubicación");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onSuccess: () => {
      toast.success("Ubicación eliminada correctamente");
    },
  });
};
