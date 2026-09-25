import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { deleteEvaluation } from "../services/actions";
import { Evaluation } from "../interfaces/evaluation.interface";
import { EVALUATIONS_KEY } from "./useEvaluations";

/**
 * Clave de la mutación: el menú de cada fila lee de la `MutationCache` qué ids
 * se están borrando (ver `usePendingEvaluationDeleteIds`).
 */
export const deleteEvaluationMutationKey = ["delete-evaluation"] as const;

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteEvaluationMutationKey,
    mutationFn: deleteEvaluation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: EVALUATIONS_KEY });
      const previousEvaluations = queryClient.getQueryData<Evaluation[]>(EVALUATIONS_KEY);

      // Borrado FÍSICO: la fila no vuelve con el refetch, así que el optimista
      // la saca del listado. Mismo patrón que `useDeleteTraining`.
      if (previousEvaluations) {
        queryClient.setQueryData<Evaluation[]>(EVALUATIONS_KEY, (old) =>
          old ? old.filter((evaluation) => evaluation.id !== id) : []
        );
      }

      return { previousEvaluations };
    },
    onError: (err, id, context) => {
      if (context?.previousEvaluations) {
        queryClient.setQueryData(EVALUATIONS_KEY, context.previousEvaluations);
      }
      console.error(err);
      // Solo un 400 trae un motivo que mostrar; un 5xx o un fallo de red cae
      // al texto en español. `extractErrorMessage` no sirve aquí: devuelve el
      // `message` crudo de Axios antes de su respaldo.
      const drfMessage =
        err instanceof AxiosError && err.response?.status === 400
          ? firstDrfFieldMessage(err)
          : undefined;
      toast.error(drfMessage ?? "No se pudo eliminar la evaluación. Intenta de nuevo.");
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVALUATIONS_KEY }),
    onSuccess: () => {
      toast.success("Evaluación eliminada correctamente");
    },
  });
};
