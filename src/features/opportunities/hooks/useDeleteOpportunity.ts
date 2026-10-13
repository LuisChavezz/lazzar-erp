import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { opportunityActionErrorMessage } from "./opportunityErrorMessages";

/**
 * Da de baja una oportunidad (baja lógica en el backend). Sin optimista: la
 * fila sale del listado cuando el refetch por prefijo responde, y con ella se
 * actualiza el total.
 */
export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOpportunity,
    onSuccess: () => {
      toast.success("Oportunidad dada de baja correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        opportunityActionErrorMessage(error, "No se pudo dar de baja la oportunidad. Intenta de nuevo.")
      );
    },
    // Se devuelve la promesa: la mutación sigue "pending" hasta que el listado
    // se refresca, y la confirmación se cierra con la fila ya fuera.
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};
