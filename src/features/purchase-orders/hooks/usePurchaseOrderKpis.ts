import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPurchaseOrderKpis } from "../services/actions";
import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";

/**
 * Llave propia, FUERA del prefijo `["purchase-orders"]`: los indicadores no se
 * derivan del listado, así que no se refrescan solos con él. Las mutaciones de
 * OC que cambian estatus o importes (alta, edición, confirmar, cancelar y
 * eliminar) la invalidan explícitamente.
 */
export const purchaseOrderKpisQueryKey = ["purchase-order-kpis"] as const;

/**
 * Indicadores de órdenes de compra (`GET /compras/ordenes/kpis/`).
 *
 * `refetchOnMount: "always"`: el backend los CALCULA en cada lectura a partir
 * de OCs y recepciones que cambian en otras pantallas; con el `staleTime`
 * global de 15 min, volver a la lista mostraría cifras viejas. Mismo criterio
 * que `usePedidoKpis` y `useCustomerKpis`.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const usePurchaseOrderKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<PurchaseOrderKpis>({
    queryKey: purchaseOrderKpisQueryKey,
    queryFn: () => getPurchaseOrderKpis(),
    refetchOnMount: "always",
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "purchase-order-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, isInitialError, isFetching, refetch };
};
