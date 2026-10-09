import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPurchaseOrderKpis } from "../services/actions";
import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";

/**
 * Llave DENTRO del prefijo `["purchase-orders"]` (como el historial por
 * proveedor, `["purchase-orders", "by-supplier", …]`): toda mutación que ya
 * invalida ese prefijo —alta, edición, confirmar, cancelar, eliminar, enviar
 * correo, recepciones e inspecciones de calidad— refresca también los
 * indicadores, sin que cada una tenga que acordarse. No choca con el detalle
 * `["purchase-orders", id]`: `id` es numérico.
 */
export const purchaseOrderKpisQueryKey = ["purchase-orders", "kpis"] as const;

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
