import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBank } from "../services/actions";
import { BankFormValues } from "../schemas/bank.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { forbiddenDetailMessage } from "@/src/utils/drfWriteErrors";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

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
            // `empresa`, cuando el usuario no tiene empresa asignada: desde
            // EC-798 la resuelve el servidor para todos, superusuario incluido).
            // Esas no tienen dónde pintarse; el toast de abajo las cubre.
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
      toast.error(forbiddenDetailMessage(error) ?? "Error al registrar el banco");
    },
  });
};
