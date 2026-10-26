import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../services/actions";
import { customerKpisQueryKey } from "./useCustomerKpis";
import { Customer, CustomerCreate } from "../interfaces/customer.interface";
import toast from "react-hot-toast";
import {
  CustomerFormField,
  getCustomerFormFields,
  getCustomerWriteErrorMessage,
  SetCustomerFieldError,
} from "./customerErrorMessages";

interface UseCreateCustomerOptions {
  setError?: SetCustomerFieldError;
  /** Rechazo que no es de un campo (p.ej. Facturama), para el banner del formulario. */
  onFormError?: (message: string) => void;
  /** Campos que pinta el formulario; un error de cualquier otro va a `onFormError`. */
  formFields?: readonly CustomerFormField[];
  invalidateOrderOnboarding?: boolean;
}

export const useCreateCustomer = ({
  setError,
  onFormError,
  formFields = getCustomerFormFields(false),
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
      const formError = getCustomerWriteErrorMessage(error, formFields, setError);
      if (formError) {
        onFormError?.(formError);
      }
      toast.error(formError ?? "No se pudo registrar el cliente");
    },
  });
};
