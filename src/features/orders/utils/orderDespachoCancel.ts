import type { QueryClient } from "@tanstack/react-query";
import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { shipmentCancelDialogContent } from "@/src/features/shipping/utils/shipmentCancelAction";
import type { Shipment } from "@/src/features/shipping/interfaces/shipping.interface";
import { pedidoDocumentosQueryKey } from "../hooks/usePedidoDocumentos";
import type {
  PedidoDocumentoDespacho,
  PedidoDocumentos,
} from "../interfaces/pedido-documentos.interface";
import { patchDocumentosDespacho } from "./pedidoDocumentos";

/**
 * Escribe el resultado de cancelar un despacho en la fila de los documentos
 * del pedido en caché (`estado` y motivo, `patchDocumentosDespacho`). Cancela
 * antes la lectura en vuelo de esos documentos, para que una respuesta vieja
 * no la pise. Nunca lanza: es best-effort, como `cachedRows`.
 */
export const writeDespachoToPedidoDocumentos = async (
  queryClient: QueryClient,
  pedidoId: number,
  shipment: Shipment,
) => {
  try {
    const queryKey = pedidoDocumentosQueryKey(pedidoId);
    await queryClient.cancelQueries({ queryKey, exact: true });
    const current = queryClient.getQueryData<PedidoDocumentos>(queryKey);
    const next = patchDocumentosDespacho(current, shipment);
    if (next !== current) queryClient.setQueryData(queryKey, next);
  } catch (error) {
    console.error("No se pudo escribir el despacho cancelado en los documentos del pedido", error);
  }
};

/**
 * "Cancelar envío" desde la fila de un despacho en la hoja Documentos del
 * pedido (EC-946): el mismo diálogo y acción que el detalle del envío
 * (`shipmentCancelDialogContent`, EC-945), con un `applyResult` que ADEMÁS
 * escribe la fila de los documentos. Corre dentro del `onSuccess` del hook,
 * antes de sus invalidaciones (regla EC-927), así que si la relectura falla
 * la fila no sigue ofreciendo "Cancelar". El resto de las cancelaciones de
 * WMS no cambia.
 */
export const orderDespachoCancelDialogContent = (
  pedidoId: number,
  despacho: Pick<PedidoDocumentoDespacho, "id" | "packing_folio">,
): WmsCancelDialogContent<Shipment> => {
  const content = shipmentCancelDialogContent({ id: despacho.id, packing_folio: despacho.packing_folio });
  const { applyResult } = content.action;
  return {
    ...content,
    action: {
      ...content.action,
      applyResult: async (queryClient, shipment) => {
        await applyResult(queryClient, shipment);
        await writeDespachoToPedidoDocumentos(queryClient, pedidoId, shipment);
      },
    },
  };
};
