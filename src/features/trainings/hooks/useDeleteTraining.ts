import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { deleteTraining } from "../services/actions";
import { Training } from "../interfaces/training.interface";

/**
 * Clave de la mutación: el menú de cada fila lee de la `MutationCache` qué ids
 * se están borrando (ver `usePendingTrainingDeleteIds`).
 */
export const deleteTrainingMutationKey = ["delete-training"] as const;

export const useDeleteTraining = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteTrainingMutationKey,
    mutationFn: deleteTraining,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["trainings"] });
      const previousTrainings = queryClient.getQueryData<Training[]>(["trainings"]);

      // Borrado FÍSICO (a diferencia de contratos): la fila no vuelve con el
      // refetch, así que el optimista la saca del listado. Mismo patrón que
      // `useDeleteColor`.
      if (previousTrainings) {
        queryClient.setQueryData<Training[]>(["trainings"], (old) =>
          old ? old.filter((training) => training.id !== id) : []
        );
      }

      return { previousTrainings };
    },
    onError: (err, id, context) => {
      if (context?.previousTrainings) {
        queryClient.setQueryData(["trainings"], context.previousTrainings);
      }
      console.error(err);
      // Solo un 400 trae un motivo que mostrar; un 5xx o un fallo de red cae
      // al texto en español (ver `useDeleteEmployee`). `extractErrorMessage`
      // no sirve aquí: devuelve el `message` crudo de Axios ("Request failed
      // with status code 500", "Network Error") antes de su respaldo.
      const drfMessage =
        err instanceof AxiosError && err.response?.status === 400
          ? firstDrfFieldMessage(err)
          : undefined;
      toast.error(drfMessage ?? "No se pudo eliminar la capacitación. Intenta de nuevo.");
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["trainings"] }),
    onSuccess: () => {
      toast.success("Capacitación eliminada correctamente");
    },
  });
};
