import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getPurchaseOrders } from "../services/actions";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";

/**
 * Llave de la lista COMPLETA (sin paginar) de órdenes de compra. Va bajo
 * `"full"` y no en el prefijo pelado `["purchase-orders"]`, del que también
 * cuelgan la tabla paginada, los KPIs y el detalle: así ninguna otra consulta
 * comparte llave con ella y las mutaciones la siguen refrescando al invalidar
 * el prefijo.
 */
export const purchaseOrdersFullQueryKey = ["purchase-orders", "full"] as const;

/**
 * Lista completa de órdenes de compra, para lo que todavía deriva algo del
 * conjunto entero (el dashboard de Compras) o filtra en memoria lo que el
 * backend no sabe filtrar (el selector de OC de facturas de proveedor). Una
 * lista que se puede paginar usa `usePurchaseOrdersTable`.
 *
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const usePurchaseOrders = () => {
  const { data, hasLoaded, isLoading, isInitialError, error, refetch, isFetching } =
    useGuardedQuery<PurchaseOrder[]>(
      {
        queryKey: purchaseOrdersFullQueryKey,
        queryFn: getPurchaseOrders,
        gcTime: LIST_QUERY_GC_TIME,
      },
      { toastId: "purchase-orders-refetch-error" },
    );

  return {
    purchaseOrders: data ?? [],
    /**
     * `true` en cuanto hubo una respuesta exitosa, y se conserva durante los
     * refetch (también si uno falla): distingue "aún no cargó" de "cargó
     * vacío", que `purchaseOrders` (siempre un arreglo) no deja ver.
     */
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};
