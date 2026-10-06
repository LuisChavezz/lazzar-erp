import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
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
 * Un 404 es DEFINITIVO aunque haya datos en caché (proveedor desactivado o de
 * otra empresa desde la última visita): `isNotFound` lo expone para que la
 * vista muestre "no disponible" en vez de los datos viejos, y no cuenta como
 * "refetch fallido" para `useHasLoadedQuery` (sin toast). Los demás errores de
 * refetch conservan la vista y avisan por toast.
 *
 * `isValidId` es la ÚNICA validación del id: con uno inválido la query queda
 * deshabilitada (y `pending` para siempre), así que la vista lo resuelve antes
 * de mirar la carga.
 */
export const useSupplier = (supplierId: string) => {
  const queryClient = useQueryClient();
  const numericId = parseSupplierId(supplierId);
  const isValidId = numericId !== null;

  const { data, isPlaceholderData, isError, errorUpdatedAt, error } = useQuery<Supplier>({
    queryKey: ["suppliers", numericId],
    queryFn: () => getSupplier(numericId as number),
    enabled: isValidId,
    retry: retryUnlessClientError,
    placeholderData: () =>
      queryClient
        .getQueryData<Supplier[]>(["suppliers"])
        ?.find((item) => item.id === numericId),
  });

  const isNotFound = isError && isNotFoundError(error);

  const { hasLoaded } = useHasLoadedQuery({
    // La fila del listado no cuenta como "cargado": solo la respuesta real.
    data: isPlaceholderData ? undefined : data,
    isError: isError && !isNotFound,
    errorUpdatedAt,
    toastId: "supplier-detail-refetch-error",
    errorMessage: "No se pudo actualizar el proveedor. Mostrando datos anteriores.",
  });

  return { data, numericId, isPlaceholderData, isError, isNotFound, error, isValidId, hasLoaded };
};
