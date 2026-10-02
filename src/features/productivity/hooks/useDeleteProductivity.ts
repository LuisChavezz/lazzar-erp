import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteProductivityRecord } from "../services/actions";
import { Productivity } from "../interfaces/productivity.interface";
import { PRODUCTIVITY_KEY } from "./useProductivity";
import { productivityActionErrorMessage } from "./productivityErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingProductivityIds`). */
export const deleteProductivityMutationKey = ["delete-productivity"] as const;

export const useDeleteProductivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteProductivityMutationKey,
    mutationFn: deleteProductivityRecord,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: PRODUCTIVITY_KEY });
      const previousRecords = queryClient.getQueryData<Productivity[]>(PRODUCTIVITY_KEY);

      // Borrado FÍSICO: la fila no vuelve con el refetch, así que el optimista
      // la saca del listado. Mismo patrón que `useDeleteAbsence`.
      if (previousRecords) {
        queryClient.setQueryData<Productivity[]>(PRODUCTIVITY_KEY, (old) =>
          old ? old.filter((record) => record.id !== id) : []
        );
      }

      return { previousRecords };
    },
    onError: (err, _id, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(PRODUCTIVITY_KEY, context.previousRecords);
      }
      console.error(err);
      toast.error(
        productivityActionErrorMessage(err, "No se pudo eliminar el registro. Intenta de nuevo.")
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTIVITY_KEY }),
    onSuccess: () => {
      toast.success("Registro de productividad eliminado correctamente");
    },
  });
};
