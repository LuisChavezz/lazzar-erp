"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { pageNumberAdapter } from "@/src/utils/serverListAdapters";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";
import { getSurtidoPedidosPage } from "../services/actions";
import { SURTIDO_PEDIDOS_KEY, surtidoPedidosTable } from "../constants/surtidoPedidosTable";

// A nivel de módulo: una referencia estable entre renders.
const surtidoPedidosAdapter = pageNumberAdapter<SurtidoPedido>();

/**
 * Avance de surtido por pedido en MODO SERVIDOR: filtros, búsqueda y página en
 * la URL (`useServerTable`), así que la página que lo monta lo envuelve en
 * `<Suspense>`. Consulta bajo `["surtido-pedidos", "list", params]`.
 */
export const useSurtidoPedidosTable = () =>
  useServerTable({
    definition: surtidoPedidosTable,
    queryKey: SURTIDO_PEDIDOS_KEY,
    queryFn: getSurtidoPedidosPage,
    adapter: surtidoPedidosAdapter,
    toastId: "surtido-pedidos-table-refetch-error",
    refetchErrorMessage:
      "No se pudo actualizar el avance de surtido. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudo cargar el avance de surtido.",
  });
