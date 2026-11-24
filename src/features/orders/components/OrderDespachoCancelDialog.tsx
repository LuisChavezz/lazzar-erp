"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { WmsCancelDialog } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { shipmentCancelDialogContent } from "@/src/features/shipping/utils/shipmentCancelAction";
import { pedidoDocumentosQueryKey } from "../hooks/usePedidoDocumentos";
import type {
  PedidoDocumentoDespacho,
  PedidoDocumentos,
} from "../interfaces/pedido-documentos.interface";
import { patchDocumentosDespacho } from "../utils/pedidoDocumentos";

interface OrderDespachoCancelDialogProps {
  pedidoId: number;
  /** Despacho a cancelar; `null` = cerrado. */
  despacho: PedidoDocumentoDespacho | null;
  onClose: () => void;
}

/**
 * "Cancelar envío" desde la fila de un despacho en la hoja Documentos del
 * pedido (EC-946): el mismo diálogo y acción que el detalle del envío
 * (`shipmentCancelDialogContent`, EC-945). Quien lo monta decide si se ofrece
 * (`useCanCancelWmsDocuments`) y lo deja montado, con `despacho = null` para
 * cerrarlo; la copia del despacho se toma al abrir (`useDialogSession`).
 *
 * Al cancelar escribe `estado` y motivo en la fila de los documentos en caché
 * (`patchDocumentosDespacho`) antes de la relectura que dispara la acción
 * (`invalidateAfterWmsCancellation` → `invalidatePedidoProgress`).
 */
export function OrderDespachoCancelDialog({ pedidoId, despacho, onClose }: OrderDespachoCancelDialogProps) {
  const queryClient = useQueryClient();
  const open = despacho !== null;
  const session = useDialogSession(open, despacho);
  const target = session.snapshot;
  if (!target) return null;

  return (
    <WmsCancelDialog
      content={{
        ...shipmentCancelDialogContent({ id: target.id, packing_folio: target.packing_folio }),
        onSuccess: (shipment) =>
          queryClient.setQueryData<PedidoDocumentos | undefined>(
            pedidoDocumentosQueryKey(pedidoId),
            (current) => patchDocumentosDespacho(current, shipment),
          ),
      }}
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    />
  );
}
