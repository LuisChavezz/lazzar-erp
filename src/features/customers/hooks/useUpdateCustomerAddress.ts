import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";

import { updateCustomerAddress } from "../services/actions";
import { CustomerAddressCreate } from "../interfaces/customer-address.interface";

interface UpdateAddressVariables {
  id: number;
  data: CustomerAddressCreate;
}

export const useUpdateCustomerAddress = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddressCreate, unknown, UpdateAddressVariables>({
    mutationFn: ({ id, data }) => updateCustomerAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      toast.success("Dirección actualizada correctamente");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError &&
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo actualizar la dirección";
      toast.error(message);
    },
  });
};
