"use client";

import { CopyIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useCreateAndOpenQuote } from "@/src/features/quotes/hooks/useCreateAndOpenQuote";
import { recomprarPedidoMutationKey, useRecomprarPedido } from "../hooks/useRecomprarPedido";

interface OrderRecompraActionProps {
  pedidoId: number;
  pedidoFolio: string | null;
}

/**
 * Botón "Recompra" con su confirmación. Quien lo monta decide si se muestra
 * (permiso + estatus); el flujo —POST no idempotente con candado síncrono y
 * navegación a la cotización nueva en una transición— es el de
 * `useCreateAndOpenQuote`.
 *
 * Vive en la barra superior, FUERA de las hojas: su diálogo no se monta ni se
 * desmonta al cambiar de hoja.
 */
export function OrderRecompraAction({ pedidoId, pedidoFolio }: OrderRecompraActionProps) {
  const { mutateAsync: recomprar } = useRecomprarPedido(pedidoId);
  const {
    isCreating: isRecomprando,
    triggerProps,
    confirmDialogProps,
  } = useCreateAndOpenQuote({
    mutationKey: recomprarPedidoMutationKey(pedidoId),
    create: async () => (await recomprar(pedidoId)).cotizacion.id,
  });

  return (
    <>
      <Button variant="secondary" {...triggerProps} className="inline-flex items-center gap-2">
        <CopyIcon className="w-4 h-4" aria-hidden="true" />
        Recompra
      </Button>
      <ConfirmDialog
        {...confirmDialogProps}
        title="Crear cotización de recompra"
        description={`Se creará una cotización NUEVA en borrador a partir del pedido ${
          pedidoFolio || `#${pedidoId}`
        }, con sus mismos productos, tallas y servicios. Los precios se copian tal como están en este pedido (no se recalculan); podrás ajustarlos antes de enviarla a revisión. Este pedido no se modifica.`}
        confirmText={isRecomprando ? "Creando..." : "Crear cotización"}
        confirmColor="blue"
      />
    </>
  );
}
