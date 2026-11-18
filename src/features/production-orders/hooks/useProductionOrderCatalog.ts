import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getProductionOrders } from "@/src/features/production-orders/services/actions";

/**
 * Listado de OP como CATÁLOGO de un selector, sobre la misma llave y consulta
 * que `useProductionOrders` (`["production-orders"]`), pero por
 * `useGuardedQuery`: expone `isInitialError`, no el `isError` crudo.
 * `useProductionOrders` sigue sin migrar (#239) porque sus consumidores
 * (listado de OP, tablero, desglose de RH) dependen de su forma actual.
 *
 * `enabled: false` no pide el listado: el selector lo carga solo abierto.
 */
export const useProductionOrderCatalog = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading, isInitialError } = useGuardedQuery(
    { queryKey: ["production-orders"], queryFn: getProductionOrders, enabled },
    { toastId: "production-order-catalog-refetch-error" },
  );
  return { productionOrders: data ?? [], isLoading, isInitialError };
};
