import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";

import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { updateCustomerAddress } from "../services/actions";
import { CustomerAddressCreate } from "../interfaces/customer-address.interface";
import {
  CUSTOMER_ADDRESS_FORM_FIELDS,
  CustomerAddressFormField,
} from "../schemas/customer-address.schema";

interface UpdateAddressVariables {
  id: number;
  data: CustomerAddressCreate;
}

export const useUpdateCustomerAddress = (
  setFieldError?: (field: CustomerAddressFormField, message: string) => void
) => {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddressCreate, unknown, UpdateAddressVariables>({
    mutationFn: ({ id, data }) => updateCustomerAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      toast.success("Dirección actualizada correctamente");
    },
    onError: (error) => {
      const fallback =
        error instanceof AxiosError &&
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo actualizar la dirección";
      // Cada error de campo va bajo su input; el de una clave sin campo
      // (`cliente`, `non_field_errors`) es el texto del toast.
      toast.error(handleDrfWriteError(error, fallback, CUSTOMER_ADDRESS_FORM_FIELDS, setFieldError));
    },
  });
};
