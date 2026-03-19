import { useQuery } from "@tanstack/react-query";
import { getCustomers } from "../services/actions";
import { Customer } from "../interfaces/customer.interface";

export const useCustomers = () => {
  const {
    data: customers = [],
    isLoading,
    isError,
    error,
  } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  return {
    customers,
    isLoading,
    isError,
    error,
  };
};
