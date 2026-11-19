"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSurtidoPedidosPage } from "@/src/features/order-fulfillment/services/actions";
import { isSurtidoCompleto } from "@/src/features/order-fulfillment/constants/surtidoEtapa";
import { SURTIDO_PEDIDOS_KEY } from "@/src/features/order-fulfillment/constants/surtidoPedidosTable";

/** Tope de página del backend (`page_size` máx. 200). */
export const SURTIDOS_LIMIT = 200;

/**
 * Pedidos YA surtidos por completo (surtidas ≥ pedidas), de cualquier estatus,
 * para la pestaña "Surtidos" de Pedidos WMS. La cifra la da el backend
 * (`/wms/surtido-pedidos/`); aquí solo se separan los completos.
 */
export const useSurtidosCompletos = () => {
  const { data, ...rest } = useGuardedQuery(
    {
      queryKey: [...SURTIDO_PEDIDOS_KEY, "completos"],
      queryFn: async () => {
        const page = await getSurtidoPedidosPage({ estatus: "todos", page: 1, page_size: SURTIDOS_LIMIT });
        return { rows: page.results.filter(isSurtidoCompleto), truncated: page.count > SURTIDOS_LIMIT };
      },
    },
    { toastId: "surtidos-completos-refetch-error" },
  );
  return { surtidos: data?.rows ?? [], truncated: data?.truncated ?? false, ...rest };
};
