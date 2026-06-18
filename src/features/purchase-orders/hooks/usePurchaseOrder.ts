import { useQuery } from "@tanstack/react-query";
import { getPurchaseOrder } from "../services/actions";
import { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";

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
    queryKey: ["purchase-orders", id],
    queryFn: () => getPurchaseOrder(id as number),
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
