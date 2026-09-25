import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { updateIncident } from "../services/actions";
import { IncidentPayload } from "../interfaces/incident.interface";
import { IncidentFormValues } from "../schemas/incident.schema";
import { INCIDENTS_KEY } from "./useIncidents";

type SetIncidentError = (
  field: keyof IncidentFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateIncident = (setError?: SetIncidentError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: IncidentPayload) => updateIncident(id, values),
    onSuccess: () => {
      toast.success("Incidencia actualizada correctamente");
    },
    onError: (error) => {
      // Mensaje a nivel de objeto, no de campo: si el backend lo manda en
      // `non_field_errors`, sin esto el usuario solo vería el toast genérico.
      let formError: string | undefined;

      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;
          formError = firstDrfMessage(validationErrors.non_field_errors);

          if (setError) {
            Object.keys(validationErrors).forEach((key) => {
              if (key === "non_field_errors") {
                return;
              }
              const fieldKey = key as keyof IncidentFormValues;
              const errorMessages = validationErrors[key];

              if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                setError(fieldKey, {
                  type: "server",
                  message: errorMessages[0],
                });
              }
            });
          }
        }
      }

      toast.error(formError ?? "Error al actualizar la incidencia");
    },
    // Se devuelve la promesa para que `mutateAsync` no resuelva hasta que el
    // refetch termine: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY }),
  });
};
