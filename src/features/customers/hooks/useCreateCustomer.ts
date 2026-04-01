import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../services/actions";
import { Customer, CustomerCreate } from "../interfaces/customer.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { CustomerFormValues } from "../schemas/customer.schema";

type SetCustomerError = (
  field: keyof CustomerFormValues,
  error: { type?: string; message?: string }
) => void;

interface UseCreateCustomerOptions {
  setError?: SetCustomerError;
  invalidateOrderOnboarding?: boolean;
}

export const useCreateCustomer = ({
  setError,
  invalidateOrderOnboarding = false,
}: UseCreateCustomerOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<Customer, unknown, CustomerCreate>({
    mutationFn: (payload: CustomerCreate) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (invalidateOrderOnboarding) {
        queryClient.invalidateQueries({ queryKey: ["quote-onboarding"] });
      }
      toast.success("Cliente registrado correctamente");
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
      toast.error("No se pudo registrar el cliente");
    },
  });
};
