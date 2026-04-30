import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getCustomerAddresses } from "../services/actions";
import { CustomerAddress } from "../interfaces/customer-address.interface";

interface UseCustomerAddressesOptions {
  customerId: number;
  enabled?: boolean;
}

interface UseCustomerAddressesResult {
  addresses: CustomerAddress[];
  isLoading: boolean;
  isError: boolean;
}

export const useCustomerAddresses = ({
  customerId,
  enabled = true,
}: UseCustomerAddressesOptions): UseCustomerAddressesResult => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-addresses", customerId],
    queryFn: getCustomerAddresses,
    enabled,
    select: (all) => all.filter((a) => a.cliente === customerId),
  });

  const addresses = useMemo(() => data ?? [], [data]);

  return { addresses, isLoading, isError };
};
