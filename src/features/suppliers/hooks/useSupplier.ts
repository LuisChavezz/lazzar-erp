import { useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { Supplier } from "../interfaces/supplier.interface";
import { getSupplier } from "../services/actions";
import { parseSupplierId } from "../utils/supplierPurchaseOrderHistoryFilters";

/**
 * Detalle de un proveedor (`GET /terceros/proveedores/{id}/`). Mismo patrón
 * que `useCustomer`.
 *
 * La llave `["suppliers", id]` cuelga del prefijo `["suppliers"]` que ya
 * invalidan alta, edición y baja, así que el detalle se refresca tras editar
 * sin tocar esas mutaciones.
 *
 * La fila del listado se usa como `placeholderData` (no `initialData`): la
 * cabecera se pinta al instante y el GET corre SIEMPRE, que es lo que detecta
 * un proveedor desactivado (404) aunque siga en un listado viejo de la caché.
 *
 * **Un 404 o un 403 es un error DEFINITIVO** (`isDefinitiveError` de
 * `useGuardedQuery`) aunque haya datos en caché (proveedor desactivado o de
 * otra empresa desde la última visita, o se perdió el acceso): no se reintenta,
 * no avisa por toast y no conserva lo ya cargado. `isNotFound` lo expone para
 * que la vista muestre "no disponible" en vez de los datos viejos, y sigue en
 * `true` aunque el siguiente intento falle por otra cosa (un 500, la red).
 * Cualquier otro fallo sin datos es `isInitialError`; un refetch fallido con
 * datos los conserva y avisa por toast.
 *
 * `isValidId` es la ÚNICA validación del id: con uno inválido la query queda
 * deshabilitada (y `pending` para siempre), así que la vista lo resuelve antes
 * de mirar la carga.
 */
export const useSupplier = (supplierId: string) => {
  const queryClient = useQueryClient();
  const numericId = parseSupplierId(supplierId);
  const isValidId = numericId !== null;

  const { data, isPlaceholderData, isInitialError, isDefinitiveError, error } =
    useGuardedQuery<Supplier>(
      {
        queryKey: ["suppliers", numericId],
        queryFn: () => getSupplier(numericId as number),
        enabled: isValidId,
        retry: retryUnlessClientError,
        placeholderData: () =>
          queryClient
            .getQueryData<Supplier[]>(["suppliers"])
            ?.find((item) => item.id === numericId),
      },
      {
        toastId: "supplier-detail-refetch-error",
        errorMessage: "No se pudo actualizar el proveedor. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundOrForbiddenError,
      },
    );

  return {
    data,
    numericId,
    isPlaceholderData,
    isNotFound: isDefinitiveError,
    isInitialError,
    error,
    isValidId,
  };
};
