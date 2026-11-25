"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { WmsCancelDialog } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import type { PedidoDocumentoDespacho } from "../interfaces/pedido-documentos.interface";
import { orderDespachoCancelDialogContent } from "../utils/orderDespachoCancel";

interface OrderDespachoCancelDialogProps {
  pedidoId: number;
  /** Despacho a cancelar; `null` = cerrado. */
  despacho: PedidoDocumentoDespacho | null;
  onClose: () => void;
}

/**
 * "Cancelar envío" desde la fila de un despacho en la hoja Documentos del
 * pedido (EC-946), con `orderDespachoCancelDialogContent`. Quien lo monta
 * decide si se ofrece (`useCanCancelWmsDocuments`) y lo deja montado, con
 * `despacho = null` para cerrarlo; la copia del despacho se toma al abrir
 * (`useDialogSession`).
 *
 * La fila de los documentos en caché se escribe en el `applyResult` de la
 * acción, ANTES de la relectura que dispara
 * (`invalidateAfterWmsCancellation` → `invalidatePedidoProgress`).
 */
export function OrderDespachoCancelDialog({ pedidoId, despacho, onClose }: OrderDespachoCancelDialogProps) {
  const open = despacho !== null;
  const session = useDialogSession(open, despacho);
  const target = session.snapshot;
  if (!target) return null;

  return (
    <WmsCancelDialog
      content={orderDespachoCancelDialogContent(pedidoId, target)}
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    />
  );
}
