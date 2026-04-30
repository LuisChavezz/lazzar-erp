import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerAddress } from "../services/actions";
import { CustomerAddressCreate } from "../interfaces/customer-address.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useCreateCustomerAddress = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddressCreate, unknown, CustomerAddressCreate>({
    mutationFn: (payload: CustomerAddressCreate) => createCustomerAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      toast.success("Dirección registrada correctamente");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError && typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo registrar la dirección";
      toast.error(message);
    },
  });
};
