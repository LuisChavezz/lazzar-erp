import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { OPPORTUNITY_GONE, opportunityDetailKey } from "./useOpportunityDetail";
import { opportunityActionErrorMessage } from "./opportunityErrorMessages";

/**
 * Da de baja una oportunidad (baja lógica en el backend). Sin optimista: la
 * fila sale del listado cuando el refetch por prefijo responde, y con ella se
 * actualiza el total.
 *
 * El DETALLE de esa oportunidad sí se escribe en caché, como "ya no está"
 * (`OPPORTUNITY_GONE`, lo mismo que guardaría su 404): si quedara lo anterior,
 * volver a abrir su URL pintaría la ficha de una oportunidad dada de baja
 * mientras llega la relectura. Se marca en vez de quitar la consulta porque,
 * dando de baja DESDE el detalle, la consulta sigue montada y quitarla la
 * volvería a crear en el siguiente render.
 */
export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOpportunity,
    onSuccess: (_data, id) => {
      queryClient.setQueryData(opportunityDetailKey(id), OPPORTUNITY_GONE);
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
