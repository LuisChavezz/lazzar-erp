import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBankAccount } from "../services/actions";
import { BankAccountFormValues } from "../schemas/bank-account.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

type SetBankAccountError = (
  field: keyof BankAccountFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreateBankAccount = (setError?: SetBankAccountError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta bancaria registrada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            // El 400 puede traer llaves que NO son campos del formulario
            // (`empresa`, `saldo_actual`). Esas no tienen dónde pintarse; el
            // toast de abajo las cubre.
            const fieldKey = key as keyof BankAccountFormValues;
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
      toast.error("Error al registrar la cuenta bancaria");
    },
  });
};
