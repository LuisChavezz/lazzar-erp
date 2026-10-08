import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPedidoKpis } from "../services/actions";
import { PEDIDO_KPIS_QUERY_KEY } from "../constants/pedidoKpis";
import type { PedidoKpis } from "../interfaces/pedido-kpis.interface";

/**
 * Indicadores de "Mis pedidos" (`GET /ventas/pedidos/kpis/`).
 *
 * `refetchOnMount: "always"`: el backend los CALCULA en cada lectura a partir
 * de pedidos que cambian en otras pantallas (Mesa de Control autoriza y edita);
 * con el `staleTime` global de 15 min, volver a la lista mostraría cifras
 * viejas. Mismo criterio que `useProductionOrderKpis`.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const usePedidoKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<PedidoKpis>({
    queryKey: PEDIDO_KPIS_QUERY_KEY,
    queryFn: () => getPedidoKpis(),
    refetchOnMount: "always",
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "pedido-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, isInitialError, isFetching, refetch };
};
