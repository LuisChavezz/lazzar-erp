"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { useCancelPedido } from "../hooks/useCancelPedido";
import { PEDIDO_CANCEL_MOTIVO_MAX, PedidoCancelFormSchema } from "../schemas/pedido-cancel.schema";
import { countCodePoints } from "../schemas/pedido-programacion.schema";

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
 * "Cancelar pedido" con motivo obligatorio (`useCancelPedido`). Quien lo monta
 * decide si se ofrece (permiso + estatus) y es DUEÑO del estado: lo monta
 * siempre y le pasa `pedido = null` para cerrarlo, así el diálogo sobrevive a
 * que la fila desaparezca del listado al cancelarse.
 *
 * Mismo esqueleto que `PurchaseOrderCancelDialog` (`MainDialog` + `FormTextarea`
 * + `safeParse` al enviar). El motivo va con `forceUppercase`, como el texto
 * libre del resto del pedido (comentarios de programación) y el motivo de
 * cancelación de facturas.
 *
 * No se cierra a media petición. Al terminar:
 * - éxito o 404 (ya estaba cancelado): se cierra;
 * - 400 de `motivo`: se queda abierto con el error bajo el campo;
 * - otro 400/403 (`permiso`, `pedido`): se cierra, el toast trae el motivo;
 * - red o 5xx: se queda abierto con el motivo escrito para reintentar.
 */
export function PedidoCancelDialog({ pedido, onClose, onCancelled }: PedidoCancelDialogProps) {
  const open = pedido !== null;
  const session = useDialogSession(open, pedido);
  const pedidoId = session.snapshot?.id ?? 0;
  const label = session.snapshot?.folio || `#${pedidoId}`;
  const { cancel, isCancelling } = useCancelPedido(pedidoId);

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isCancelling) onClose();
      }}
      maxWidth="480px"
      showCloseButton={false}
      title="Cancelar pedido"
      description={`Se cancelará el pedido ${label} y dejará de aparecer en los listados: el inventario que se le descontó al autorizarlo vuelve a existencias y sus reservas activas se liberan. Esta acción no se puede deshacer. No se puede cancelar mientras tenga documentos ligados activos (picking, empaque, facturas, órdenes de producción, bordado, reflejante o corte de manga); cancélalos primero.`}
    >
      <PedidoCancelForm
        key={session.id}
        isCancelling={isCancelling}
        onClose={onClose}
        onSubmit={(motivo, handlers) =>
          cancel(label, motivo, {
            onSuccess: () => {
              onCancelled?.();
              onClose();
            },
            onError: handlers.onError,
          })
        }
      />
    </MainDialog>
  );
}

interface PedidoCancelFormProps {
  isCancelling: boolean;
  onClose: () => void;
  onSubmit: (motivo: string, handlers: { onError: (error: unknown) => void }) => void;
}

/** Contenido del diálogo; se monta de nuevo en cada apertura (`key`), sin borrador previo. */
function PedidoCancelForm({ isCancelling, onClose, onSubmit }: PedidoCancelFormProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  // Code points, igual que el schema y el backend.
  const motivoLength = countCodePoints(motivo.trim());

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = PedidoCancelFormSchema.safeParse({ motivo });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }
    onSubmit(parsed.data.motivo, {
      onError: (error) => {
        const motivoMessage = drfFieldMessage(error, "motivo");
        if (motivoMessage) {
          setMotivoError(motivoMessage);
          return;
        }
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 400 || status === 403) onClose();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <div>
        <FormTextarea
          label="Motivo de cancelación"
          name="motivo"
          rows={3}
          placeholder="Explica por qué se cancela el pedido"
          value={motivo}
          maxLength={PEDIDO_CANCEL_MOTIVO_MAX}
          forceUppercase
          disabled={isCancelling}
          error={motivoError ? { message: motivoError } : undefined}
          onChange={(event) => {
            setMotivo(event.target.value);
            if (motivoError) setMotivoError(null);
          }}
        />
        <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          {motivoLength}/{PEDIDO_CANCEL_MOTIVO_MAX}
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isCancelling} />
        <FormSubmitButton
          isPending={isCancelling}
          loadingLabel="Cancelando…"
          className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
        >
          Cancelar pedido
        </FormSubmitButton>
      </div>
    </form>
  );
}
