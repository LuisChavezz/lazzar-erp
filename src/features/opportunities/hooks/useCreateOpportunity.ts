import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { handleOpportunityWriteError, SetOpportunityFieldError } from "./opportunityErrorMessages";

/**
 * No envía `vendedor` ni `empresa`: el backend los fija con el usuario de la
 * sesión. Sin escritura optimista (ver `OPPORTUNITIES_KEY`).
 */
export const useCreateOpportunity = (setFieldError?: SetOpportunityFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOpportunity,
    onSuccess: () => {
      toast.success("Oportunidad registrada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleOpportunityWriteError(error, "Error al registrar la oportunidad", setFieldError)
      );
    },
    // Se devuelve la promesa para que `mutateAsync` no resuelva hasta que el
    // refetch termine: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};
