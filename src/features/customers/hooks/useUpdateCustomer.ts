import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../services/actions";
import { CustomerCreate } from "../interfaces/customer.interface";
import { CustomerFormValues } from "../schemas/customer.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface UpdateCustomerPayload extends CustomerCreate {
  id: number;
}

type SetCustomerError = (
  field: keyof CustomerFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateCustomer = (setError?: SetCustomerError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateCustomerPayload) => updateCustomer(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof CustomerFormValues;
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
      toast.error("No se pudo actualizar el cliente");
    },
  });
};
