import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";

import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { updateCustomerAddress } from "../services/actions";
import { CustomerAddressCreate } from "../interfaces/customer-address.interface";
import { CustomerAddressFormValues } from "../schemas/customer-address.schema";

interface UpdateAddressVariables {
  id: number;
  data: CustomerAddressCreate;
}

type SetAddressError = (
  field: keyof CustomerAddressFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateCustomerAddress = (setError?: SetAddressError) => {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddressCreate, unknown, UpdateAddressVariables>({
    mutationFn: ({ id, data }) => updateCustomerAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      toast.success("Dirección actualizada correctamente");
    },
    onError: (error) => {
      // Errores de campo de DRF (`{"codigo_postal": ["..."]}`): cada uno bajo su input.
      if (error instanceof AxiosError && setError && error.response?.status === 400) {
        const data = error.response.data;
        if (data && typeof data === "object") {
          Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            const message = firstDrfMessage(value);
            if (message) {
              setError(key as keyof CustomerAddressFormValues, { type: "server", message });
            }
          });
        }
      }
      const message =
        error instanceof AxiosError &&
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo actualizar la dirección";
      toast.error(message);
    },
  });
};
