import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBank } from "../services/actions";
import { BankFormValues } from "../schemas/bank.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

type SetBankError = (
  field: keyof BankFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreateBank = (setError?: SetBankError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Banco registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            // El 400 puede traer llaves que NO son campos del formulario (p. ej.
            // `empresa`, cuando un superusuario intenta crear sin especificarla).
            // Esas no tienen dónde pintarse; el toast de abajo las cubre.
            const fieldKey = key as keyof BankFormValues;
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
      toast.error("Error al registrar el banco");
    },
  });
};
