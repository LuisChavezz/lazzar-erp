import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSerieFolio } from "../services/actions";
import { SerieFolioFormValues } from "../schemas/serie-folio.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

type SetSerieFolioError = (
  field: keyof SerieFolioFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateSerieFolio = (setError?: SetSerieFolioError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSerieFolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series-folios"] });
      toast.success("Serie y folio actualizados correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof SerieFolioFormValues;
            const errorMessages = validationErrors[key];

            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0],
              });
            }
          });
          return;
        }
      }
      toast.error("Error al actualizar la serie y folio");
    },
  });
};
