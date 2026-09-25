import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createTraining } from "../services/actions";
import { TrainingFormValues } from "../schemas/training.schema";

type SetTrainingError = (
  field: keyof TrainingFormValues,
  error: { type?: string; message?: string }
) => void;

/**
 * No inyecta `empresa` desde el workspace porque el backend resuelve el tenant
 * a partir de `empleado`. Mismo caso que `useCreateContract`.
 */
export const useCreateTraining = (setError?: SetTrainingError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTraining,
    onSuccess: () => {
      toast.success("Capacitación registrada correctamente");
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
              const fieldKey = key as keyof TrainingFormValues;
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

      toast.error(formError ?? "Error al registrar la capacitación");
    },
    // Se devuelve la promesa para que `mutateAsync` no resuelva hasta que el
    // refetch termine: el diálogo se cierra con el listado ya actualizado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["trainings"] }),
  });
};
