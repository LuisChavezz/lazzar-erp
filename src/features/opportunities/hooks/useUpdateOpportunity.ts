import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import type { OpportunityUpdateVariables } from "../interfaces/opportunity.interface";
import { updateOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import {
  handleOpportunityWriteError,
  OPPORTUNITY_GONE_MESSAGE,
  SetOpportunityFieldError,
} from "./opportunityErrorMessages";

/**
 * PATCH con SOLO los campos que cambiaron (los arma el formulario): así no se
 * pisa lo que otra persona haya editado entretanto en los demás campos.
 */
export const useUpdateOpportunity = (setFieldError?: SetOpportunityFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: OpportunityUpdateVariables) => updateOpportunity(id, changes),
    onSuccess: () => {
      toast.success("Oportunidad actualizada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        isNotFoundError(error)
          ? OPPORTUNITY_GONE_MESSAGE
          : handleOpportunityWriteError(error, "Error al actualizar la oportunidad", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};
