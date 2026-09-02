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

      // El DELETE es una baja lógica: el registro NO sale del listado, pasa a
      // `activo: false`. Por eso el optimista marca la fila como inactiva en
      // lugar de filtrarla — filtrarla la hacía desaparecer para volver a
      // aparecer en cuanto el refetch la devolvía.
      if (previousPositions) {
        queryClient.setQueryData<Position[]>(["positions"], (old) =>
          old
            ? old.map((position) =>
                position.id === id ? { ...position, activo: false } : position
              )
            : []
        );
      }

      return { previousPositions };
    },
    onError: (err, id, context) => {
      if (context?.previousPositions) {
        queryClient.setQueryData(["positions"], context.previousPositions);
      }
      console.error(err);
      toast.error("Error al desactivar el puesto");
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    onSuccess: () => {
      toast.success("Puesto desactivado correctamente");
    },
  });
};
