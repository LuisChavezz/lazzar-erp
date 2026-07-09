import { useQuery } from "@tanstack/react-query";
import { getPurchaseOrder } from "../services/actions";
import { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";

/**
 * Opciones de query compartidas para obtener una orden de compra por id —
 * usadas por este hook y también por mutaciones que necesitan la MISMA
 * orden (enviar correo, descargar PDF) para reutilizar el cache de esta
 * query en vez de re-consultar el backend cuando el detalle ya está
 * cacheado (p. ej. porque el usuario ya abrió el diálogo de detalle).
 */
export const purchaseOrderQueryOptions = (id: number) => ({
  queryKey: ["purchase-orders", id] as const,
  queryFn: () => getPurchaseOrder(id),
});

/**
 * Recupera una orden de compra individual (incluyendo su `detalle`) desde
 * `GET /compras/ordenes/{id}/`.
 *
 * @param id      Identificador de la orden. Si es `null` la consulta queda
 *                deshabilitada (útil mientras no se ha seleccionado una orden).
 * @param enabled Permite diferir la petición hasta que se necesite, por
 *                ejemplo al abrir el diálogo de detalle.
 */
export const usePurchaseOrder = (id: number | null, enabled = true) => {
  const {
    data: purchaseOrder,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<PurchaseOrderDetail>({
    ...purchaseOrderQueryOptions(id as number),
    enabled: enabled && id != null,
  });

  return {
    purchaseOrder,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
