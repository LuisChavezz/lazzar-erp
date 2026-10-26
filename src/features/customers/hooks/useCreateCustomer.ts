import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../services/actions";
import { customerKpisQueryKey } from "./useCustomerKpis";
import { Customer, CustomerCreate } from "../interfaces/customer.interface";
import toast from "react-hot-toast";
import { handleCustomerWriteError, SetCustomerError } from "../utils/customerWriteError";

interface UseCreateCustomerOptions {
  setError?: SetCustomerError;
  /** Rechazo que no es de un campo (p.ej. Facturama), para el banner del formulario. */
  onFormError?: (message: string) => void;
  invalidateOrderOnboarding?: boolean;
}

export const useCreateCustomer = ({
  setError,
  onFormError,
  invalidateOrderOnboarding = false,
}: UseCreateCustomerOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<Customer, unknown, CustomerCreate>({
    mutationFn: (payload: CustomerCreate) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      // El alta suma un cliente al total de "Clientes activos vs. inactivos" y
      // el backend asigna al usuario como su vendedor (entra en su alcance).
      queryClient.invalidateQueries({ queryKey: customerKpisQueryKey });
      if (invalidateOrderOnboarding) {
        queryClient.invalidateQueries({ queryKey: ["quote-onboarding"] });
      }
      toast.success("Cliente registrado correctamente");
    },
    onError: (error) => {
      const formError = handleCustomerWriteError(error, setError);
      if (formError) {
        onFormError?.(formError);
      }
      toast.error(formError ?? "No se pudo registrar el cliente");
    },
  });
};
