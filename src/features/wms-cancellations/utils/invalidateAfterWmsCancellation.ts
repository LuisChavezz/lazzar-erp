import { partialMatchKey, type QueryClient } from "@tanstack/react-query";
import { PEDIDO_PROGRAMAR_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { SURTIDO_PEDIDOS_KEY } from "@/src/features/order-fulfillment/constants/surtidoPedidosTable";
import { ORDERS_QUERY_KEY } from "@/src/features/orders/constants/ordersQueryKeys";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { PICKING_DETAIL_QUERY_KEY } from "@/src/features/picking/constants/pickingQueryKeys";
import { PICKINGS_KEY } from "@/src/features/picking/constants/pickingsTable";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";

/**
 * Todo lo que puede cambiar una cancelación de WMS o la reversa de una TR
 * (EC-945). Se invalida lo mismo para las cuatro: cada una mueve a las
 * vecinas (cancelar un despacho deja su packing por despachar y el surtido
 * "empacado"; cancelar un packing deja el surtido por empacar; cancelar un
 * surtido devuelve piezas por surtir al pedido; revertir una TR deja al surtido
 * en otro almacén).
 *
 * - Listados y detalles de los cuatro documentos, y sus onboardings (las líneas
 *   vuelven a ofrecerse).
 * - Avance de surtido (`["surtido-pedidos"]`), el pedido 360° (detalle,
 *   trazabilidad, Documentos, programar) y los pedidos de Mesa de Control
 *   (`piezas_surtidas`).
 * - Existencias: el despacho devuelve prendas con una ENTRADA, la reversa de TR
 *   las mueve y el surtido libera reservas. "Programar pedido" ya lo relee
 *   `invalidatePedidoProgress`: se excluye aquí para no pedirlo dos veces.
 * - La bitácora de documentos (`CANCELAR` queda registrada).
 *
 * Invalidar no reordena ni quita filas: un documento cancelado puede seguir
 * en una vista filtrada por un estado que ya no tiene hasta el siguiente refetch.
 */
export const invalidateAfterWmsCancellation = (queryClient: QueryClient): Promise<void> =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["shipments"] }),
    queryClient.invalidateQueries({ queryKey: ["shipping-onboarding"] }),
    queryClient.invalidateQueries({ queryKey: ["packings"] }),
    queryClient.invalidateQueries({ queryKey: ["packing-detail"] }),
    queryClient.invalidateQueries({ queryKey: ["packing-onboarding"] }),
    queryClient.invalidateQueries({ queryKey: PICKINGS_KEY }),
    queryClient.invalidateQueries({ queryKey: PICKING_DETAIL_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ["picking-onboarding"] }),
    queryClient.invalidateQueries({ queryKey: ["transferencias"] }),
    queryClient.invalidateQueries({ queryKey: ["transferencia-detail"] }),
    queryClient.invalidateQueries({ queryKey: SURTIDO_PEDIDOS_KEY }),
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY }),
    invalidatePedidoProgress(queryClient),
    invalidateStockQueries(queryClient, {
      exclude: (query) => partialMatchKey(query.queryKey, PEDIDO_PROGRAMAR_QUERY_KEY),
    }),
  ]).then(() => undefined);
