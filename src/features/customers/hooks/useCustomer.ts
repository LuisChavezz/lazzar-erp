import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { Customer, CustomerDetail } from "../interfaces/customer.interface";
import { getCustomer } from "../services/actions";

// Un 4xx (404 de un cliente inexistente o fuera del alcance del usuario) es
// determinista: reintentarlo solo retrasa el error y repite la petición. El
// resto de fallos conserva el `retry: 1` global de `Provider.tsx`.
const retryUnlessClientError = (failureCount: number, error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

/**
 * Detalle de un cliente (`GET /terceros/clientes/{id}/`), que es el ÚNICO
 * endpoint que trae `resumen_comercial`.
 *
 * La fila del listado (`["customers"]`) se usa como `placeholderData` y NO como
 * `initialData`: el placeholder no se escribe en caché ni cuenta como dato
 * fresco, así que la cabecera se pinta al instante y el GET del detalle corre
 * SIEMPRE. Con `initialData` (o sembrando la caché al navegar) la fila del
 * listado pasaba por respuesta vigente durante los 15 min de `staleTime` y el
 * resumen nunca llegaba. `isPlaceholderData` le dice a la UI que aún está
 * mostrando la fila del listado.
 *
 * El id se compara como string: el backend lo manda como número aunque
 * `Customer.id` esté tipado `string`, y la queryKey usa el string de la URL.
 *
 * `isValidId` es la ÚNICA validación del id: con un id inválido la query queda
 * deshabilitada (y `isPending` para siempre), así que la vista debe resolverlo
 * antes de mirar el estado de carga. `hasLoaded` (vía `useHasLoadedQuery`)
 * separa una carga inicial fallida de un refetch fallido con datos, que
 * conserva lo ya cargado y avisa por toast.
 */
export const useCustomer = (customerId: string) => {
  const queryClient = useQueryClient();
  const numericCustomerId = Number(customerId);
  const isValidId = Number.isFinite(numericCustomerId) && numericCustomerId > 0;

  const { data, isPlaceholderData, isError, errorUpdatedAt, error } = useQuery<CustomerDetail>({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(numericCustomerId),
    enabled: isValidId,
    retry: retryUnlessClientError,
    placeholderData: () =>
      queryClient
        .getQueryData<Customer[]>(["customers"])
        ?.find((item) => String(item.id) === customerId),
  });

  const { hasLoaded } = useHasLoadedQuery({
    // La fila del listado no cuenta como "cargado": solo la respuesta real.
    data: isPlaceholderData ? undefined : data,
    isError,
    errorUpdatedAt,
    toastId: "customer-detail-refetch-error",
    errorMessage: "No se pudo actualizar el cliente. Mostrando datos anteriores.",
  });

  return { data, isPlaceholderData, isError, error, isValidId, hasLoaded };
};
