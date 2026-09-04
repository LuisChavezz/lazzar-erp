import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBankAccount } from "../services/actions";
import { BankAccountFormValues } from "../schemas/bank-account.schema";
import { CuentaBancariaCreate } from "../interfaces/bank-account.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface UpdateBankAccountPayload extends CuentaBancariaCreate {
  id: number;
}

type SetBankAccountError = (
  field: keyof BankAccountFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateBankAccount = (setError?: SetBankAccountError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateBankAccountPayload) =>
      updateBankAccount(id, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      // El resumen repite alias, número y saldo de la cuenta: si se quedara con
      // la copia anterior, el diálogo abierto mostraría datos ya editados.
      queryClient.invalidateQueries({
        queryKey: ["bank-account-summary", variables.id],
      });
      toast.success("Cuenta bancaria actualizada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
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
      toast.error("Error al actualizar la cuenta bancaria");
    },
  });
};
