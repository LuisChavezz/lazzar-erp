import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../services/actions";
import { customerKpisQueryKey } from "./useCustomerKpis";
import { CustomerCreate } from "../interfaces/customer.interface";
import toast from "react-hot-toast";
import {
  CustomerFormField,
  getCustomerFormFields,
  getCustomerWriteErrorMessage,
  SetCustomerFieldError,
} from "./customerErrorMessages";

interface UpdateCustomerPayload extends CustomerCreate {
  id: number;
}

interface UseUpdateCustomerOptions {
  setError?: SetCustomerFieldError;
  /** Rechazo que no es de un campo (p.ej. Facturama), para el banner del formulario. */
  onFormError?: (message: string) => void;
  /** Campos que pinta el formulario; un error de cualquier otro va a `onFormError`. */
  formFields?: readonly CustomerFormField[];
}

export const useUpdateCustomer = ({
  setError,
  onFormError,
  formFields = getCustomerFormFields(false),
}: UseUpdateCustomerOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateCustomerPayload) => updateCustomer(id, values),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      // `useCustomer` usa el id de la URL (string) en su queryKey.
      queryClient.invalidateQueries({ queryKey: ["customer", String(id)] });
      // Los drill-downs de los indicadores muestran `cliente.nombre`; editarlo
      // dejaría el nombre viejo en el top de ventas y en la cartera.
      queryClient.invalidateQueries({ queryKey: customerKpisQueryKey });
      toast.success("Cliente actualizado correctamente");
    },
    onError: (error) => {
      const formError = getCustomerWriteErrorMessage(error, formFields, setError);
      if (formError) {
        onFormError?.(formError);
      }
      toast.error(formError ?? "No se pudo actualizar el cliente");
    },
  });
};
