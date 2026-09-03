import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { deleteShift } from "../services/actions";
import { Shift } from "../interfaces/shift.interface";

export const useDeleteShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShift,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["shifts"] });
      const previousShifts = queryClient.getQueryData<Shift[]>(["shifts"]);

      // El DELETE es una baja lógica: el registro NO sale del listado, pasa a
      // `activo: false`. Por eso el optimista marca la fila como inactiva en
      // lugar de filtrarla — filtrarla la haría desaparecer para volver a
      // aparecer en cuanto el refetch la devolviera.
      if (previousShifts) {
        queryClient.setQueryData<Shift[]>(["shifts"], (old) =>
          old ? old.map((shift) => (shift.id === id ? { ...shift, activo: false } : shift)) : []
        );
      }

      return { previousShifts };
    },
    onError: (err, id, context) => {
      if (context?.previousShifts) {
        queryClient.setQueryData(["shifts"], context.previousShifts);
      }
      console.error(err);
      toast.error(extractErrorMessage(err, "Error al desactivar el turno"));
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
    onSuccess: () => {
      toast.success("Turno desactivado correctamente");
    },
  });
};
