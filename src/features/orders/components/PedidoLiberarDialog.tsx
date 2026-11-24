"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { isDrfActionRejection, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { useLiberarPedido } from "../hooks/usePedidoRetencion";
import type { PedidoCancelTarget } from "./PedidoCancelDialog";

interface PedidoLiberarDialogProps {
  /** Pedido a liberar; `null` = cerrado. */
  pedido: PedidoCancelTarget | null;
  onClose: () => void;
}

/**
 * Confirmación de "Liberar pedido" (`useLiberarPedido`), sin comentario. Quien
 * lo monta decide si se ofrece (Mesa de Control, pedido retenido no
 * cancelado) y es dueño del estado, como `PedidoRetenerDialog`.
 *
 * No se cierra a media petición (`busy`). Se cierra al liberar, ante un
 * rechazo (`permiso`, `pedido` "no está retenido") o un 404; con red o 5xx
 * sigue abierto para reintentar.
 */
export function PedidoLiberarDialog({ pedido, onClose }: PedidoLiberarDialogProps) {
  const open = pedido !== null;
  const session = useDialogSession(open, pedido);
  const pedidoId = session.snapshot?.id ?? 0;
  const label = session.snapshot?.folio || `#${pedidoId}`;
  const { liberar, isReleasing } = useLiberarPedido(pedidoId);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isReleasing) onClose();
      }}
      title="Liberar pedido"
      description={`El pedido ${label} dejará de estar retenido y seguirá su flujo donde iba: volverá a salir para surtir, empacar, despachar y generar órdenes.`}
      confirmText={isReleasing ? "Liberando…" : "Liberar pedido"}
      cancelText="Volver"
      confirmColor="green"
      closeOnConfirm={false}
      busy={isReleasing}
      onConfirm={() =>
        liberar(session.snapshot?.folio ?? null, {
          onSuccess: onClose,
          onError: (error) => {
            if (isDrfActionRejection(error) || isNotFoundError(error)) onClose();
          },
        })
      }
    />
  );
}
