import { useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { Customer, CustomerDetail } from "../interfaces/customer.interface";
import { getCustomer } from "../services/actions";

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
 * **Un 404 o un 403 es un error DEFINITIVO** (`isDefinitiveError` de
 * `useGuardedQuery`): no se reintenta, no avisa por toast y no conserva lo ya
 * cargado, llegue en la carga inicial o en una relectura (otro usuario lo dio
 * de baja, o se perdió el acceso). El backend responde 404 tanto para un id
 * inexistente o dado de baja como para uno de otra empresa o no asignado al
 * vendedor. `isNotFound` lo expone a la vista, y sigue en `true` aunque el
 * siguiente intento falle por otra cosa. Cualquier otro fallo sin datos es
 * `isInitialError`; un refetch fallido con datos los conserva y avisa por toast.
 *
 * El id se compara como string: el backend lo manda como número aunque
 * `Customer.id` esté tipado `string`, y la queryKey usa el string de la URL.
 *
 * `isValidId` es la ÚNICA validación del id: con un id inválido la query queda
 * deshabilitada (y `isPending` para siempre), así que la vista debe resolverlo
 * antes de mirar el estado de carga.
 */
export const useCustomer = (customerId: string) => {
  const queryClient = useQueryClient();
  const numericCustomerId = Number(customerId);
  const isValidId = Number.isFinite(numericCustomerId) && numericCustomerId > 0;

  const { data, isPlaceholderData, isInitialError, isDefinitiveError, error } =
    useGuardedQuery<CustomerDetail>(
      {
        queryKey: ["customer", customerId],
        queryFn: () => getCustomer(numericCustomerId),
        enabled: isValidId,
        retry: retryUnlessClientError,
        placeholderData: () =>
          queryClient
            .getQueryData<Customer[]>(["customers"])
            ?.find((item) => String(item.id) === customerId),
      },
      {
        toastId: "customer-detail-refetch-error",
        errorMessage: "No se pudo actualizar el cliente. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundOrForbiddenError,
      },
    );

  return {
    data,
    isPlaceholderData,
    isNotFound: isDefinitiveError,
    isInitialError,
    error,
    isValidId,
  };
};
