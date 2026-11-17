import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSerieFolio } from "../services/actions";
import { SerieFolioFormValues } from "../schemas/serie-folio.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

type SetSerieFolioError = (
  field: keyof SerieFolioFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreateSerieFolio = (setError?: SetSerieFolioError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSerieFolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series-folios"] });
      toast.success("Serie y folio registrados correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof SerieFolioFormValues;
            const errorMessage = firstNestedFieldMessage(validationErrors[key]);

            if (errorMessage) {
              setError(fieldKey, {
                type: "server",
                message: errorMessage,
              });
            }
          });
        }
      }
      toast.error("Error al registrar la serie y folio");
    },
  });
};
