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

/**
 * Direcciones de envío de UN cliente, filtradas por el backend (`?cliente=`)
 * en vez de bajar las de toda la empresa y filtrarlas aquí (EC-768).
 *
 * Solo se consulta con un pk entero positivo: el backend responde 400 a un
 * `?cliente=` que no es entero, así que un `0`/`NaN` nunca sale a la red,
 * aunque quien llama pase `enabled: true`.
 */
export const useCustomerAddresses = ({
  customerId,
  enabled = true,
}: UseCustomerAddressesOptions): UseCustomerAddressesResult => {
  const hasValidCustomerId = Number.isInteger(customerId) && customerId > 0;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-addresses", customerId],
    // Arrow a propósito: con la función pelada React Query le inyectaría su
    // `QueryFunctionContext` como `clienteId`.
    queryFn: () => getCustomerAddresses(customerId),
    enabled: enabled && hasValidCustomerId,
  });

  const addresses = useMemo(() => data ?? [], [data]);

  return { addresses, isLoading, isError };
};
