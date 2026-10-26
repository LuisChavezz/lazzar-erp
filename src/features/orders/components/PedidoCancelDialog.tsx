"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelPedido } from "../hooks/useCancelPedido";

/** Lo que el diálogo necesita del pedido: sirve una fila del listado o el detalle. */
export interface PedidoCancelTarget {
  id: number;
  folio: string | null;
}

interface PedidoCancelDialogProps {
  /** Pedido a cancelar; `null` = cerrado. */
  pedido: PedidoCancelTarget | null;
  onClose: () => void;
  /** Tras cancelar (con los listados ya releídos), antes de cerrar. */
  onCancelled?: () => void;
}

/**
 * Confirmación de "Cancelar pedido" (`useCancelPedido`). Quien lo monta decide
 * si se ofrece (permiso + estatus) y es DUEÑO del estado: lo monta siempre y
 * le pasa `pedido = null` para cerrarlo, así el diálogo sobrevive a que la fila
 * desaparezca del listado al cancelarse.
 *
 * Se queda abierto y bloqueado (`busy`) mientras la petición está en vuelo y se
 * cierra al terminar, con éxito o con error (el motivo va en el toast).
 */
export function PedidoCancelDialog({ pedido, onClose, onCancelled }: PedidoCancelDialogProps) {
  const open = pedido !== null;
  const { snapshot } = useDialogSession(open, pedido);
  const pedidoId = snapshot?.id ?? 0;
  const label = snapshot?.folio || `#${pedidoId}`;
  const { cancel, isCancelling } = useCancelPedido(pedidoId);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Cancelar pedido"
      description={`Se cancelará el pedido ${label} y dejará de aparecer en los listados. Esta acción no se puede deshacer. No se puede cancelar mientras tenga documentos ligados activos (picking, empaque, facturas, órdenes de producción, bordado, reflejante o corte de manga); cancélalos primero.`}
      confirmText={isCancelling ? "Cancelando..." : "Cancelar pedido"}
      cancelText="Volver"
      closeOnConfirm={false}
      busy={isCancelling}
      onConfirm={() => cancel(label, { onSuccess: onCancelled, onSettled: onClose })}
    />
  );
}
