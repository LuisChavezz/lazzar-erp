import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../services/actions";
import { customerKpisQueryKey } from "./useCustomerKpis";
import { CustomerCreate } from "../interfaces/customer.interface";
import toast from "react-hot-toast";
import { handleCustomerWriteError, SetCustomerError } from "../utils/customerWriteError";

interface UpdateCustomerPayload extends CustomerCreate {
  id: number;
}

export const useUpdateCustomer = (
  setError?: SetCustomerError,
  /** Rechazo que no es de un campo (p.ej. Facturama), para el banner del formulario. */
  onFormError?: (message: string) => void
) => {
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
      const formError = handleCustomerWriteError(error, setError);
      if (formError) {
        onFormError?.(formError);
      }
      toast.error(formError ?? "No se pudo actualizar el cliente");
    },
  });
};
