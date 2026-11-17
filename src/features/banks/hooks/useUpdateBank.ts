import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBank } from "../services/actions";
import { BankFormValues } from "../schemas/bank.schema";
import { BancoCreate } from "../interfaces/bank.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { forbiddenDetailMessage } from "@/src/utils/drfWriteErrors";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

interface UpdateBankPayload extends BancoCreate {
  id: number;
}

type SetBankError = (
  field: keyof BankFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateBank = (setError?: SetBankError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateBankPayload) => updateBank(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Banco actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof BankFormValues;
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
      toast.error(forbiddenDetailMessage(error) ?? "Error al actualizar el banco");
    },
  });
};
