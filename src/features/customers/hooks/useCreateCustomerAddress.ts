import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerAddress } from "../services/actions";
import { CustomerAddressCreate } from "../interfaces/customer-address.interface";
import {
  CUSTOMER_ADDRESS_FORM_FIELDS,
  CustomerAddressFormField,
} from "../schemas/customer-address.schema";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useCreateCustomerAddress = (
  setFieldError?: (field: CustomerAddressFormField, message: string) => void
) => {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddressCreate, unknown, CustomerAddressCreate>({
    mutationFn: (payload: CustomerAddressCreate) => createCustomerAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      toast.success("Dirección registrada correctamente");
    },
    onError: (error) => {
      const fallback =
        error instanceof AxiosError && typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo registrar la dirección";
      // Cada error de campo va bajo su input; el de una clave sin campo
      // (`cliente`, `non_field_errors`) es el texto del toast.
      toast.error(handleDrfWriteError(error, fallback, CUSTOMER_ADDRESS_FORM_FIELDS, setFieldError));
    },
  });
};
