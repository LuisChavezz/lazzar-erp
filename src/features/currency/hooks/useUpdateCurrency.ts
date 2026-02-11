import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCurrency } from "../services/actions";
import { CreateCurrencyResponseError } from "../interfaces/currency.interface";
import { CurrencyFormValues } from "../schemas/currency.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";

export const useUpdateCurrency = (setError?: UseFormSetError<CurrencyFormValues>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Moneda actualizada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as CreateCurrencyResponseError;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof CurrencyFormValues;
            const errorMessages = (validationErrors as Record<string, string[]>)[key];

            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0],
              });
            }
          });
        }
      } else {
        toast.error("Error al actualizar la moneda");
      }
    },
  });
};
