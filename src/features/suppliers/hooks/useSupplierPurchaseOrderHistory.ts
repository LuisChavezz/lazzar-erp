import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getSupplierPurchaseOrderHistory } from "../services/actions";
import type {
  SupplierPurchaseOrderHistoryParams,
  SupplierPurchaseOrderHistoryResponse,
} from "../interfaces/supplier-purchase-order-history.interface";

/**
 * Historial de órdenes de compra de un proveedor, filtrado y paginado EN EL
 * SERVIDOR.
 *
 * La llave cuelga de `["purchase-orders"]`, que invalidan todas las mutaciones
 * de OC (crear, editar, confirmar, cancelar, eliminar): al volver de cancelar
 * una OC el historial ya no está viejo. Editar el proveedor NO lo refresca: sus
 * datos no cambian sus órdenes.
 *
 * Los datos anteriores se conservan mientras llega la página/filtro nuevo, en
 * vez de parpadear a la carga completa, pero SOLO del mismo proveedor: al
 * navegar de un proveedor a otro las filas del anterior no deben aparecer bajo
 * el nombre del nuevo. La consulta nunca está deshabilitada (el llamador solo
 * la monta con un id válido), así que no aplica el arreglo de `useConciliaciones`
 * para `placeholderData` en consultas deshabilitadas.
 */
export const useSupplierPurchaseOrderHistory = (
  supplierId: number,
  params: SupplierPurchaseOrderHistoryParams,
) => {
  const {
    data,
    isLoading,
    isError,
    errorUpdatedAt,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useQuery<SupplierPurchaseOrderHistoryResponse>({
    queryKey: ["purchase-orders", "by-supplier", supplierId, params],
    queryFn: () => getSupplierPurchaseOrderHistory(supplierId, params),
    retry: retryUnlessClientError,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === supplierId ? previousData : undefined,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "supplier-purchase-order-history-refetch-error",
    errorMessage: "No se pudo actualizar el historial de compras. Mostrando datos anteriores.",
  });

  return {
    data,
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  };
};
