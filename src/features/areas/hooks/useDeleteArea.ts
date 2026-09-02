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

      // El DELETE es una baja lógica: el registro NO sale del listado, pasa a
      // `activo: false`. Por eso el optimista marca la fila como inactiva en
      // lugar de filtrarla — filtrarla la hacía desaparecer para volver a
      // aparecer en cuanto el refetch la devolvía.
      if (previousAreas) {
        queryClient.setQueryData<Area[]>(["areas"], (old) =>
          old ? old.map((area) => (area.id === id ? { ...area, activo: false } : area)) : []
        );
      }

      return { previousAreas };
    },
    onError: (err, id, context) => {
      if (context?.previousAreas) {
        queryClient.setQueryData(["areas"], context.previousAreas);
      }
      console.error(err);
      toast.error("Error al desactivar el área");
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["areas"] }),
    onSuccess: () => {
      toast.success("Área desactivada correctamente");
    },
  });
};
