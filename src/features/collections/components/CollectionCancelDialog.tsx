"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CancelReasonDialogFor } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { cobroCancelDialogContent, type CollectionCancelTarget } from "../utils/cobroCancelAction";

export type { CollectionCancelTarget } from "../utils/cobroCancelAction";

interface CollectionCancelDialogProps {
  cobro: CollectionCancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Cancelar cobro" con el motivo obligatorio (EC-950): `CancelReasonDialog` con
 * `cobroCancelDialogContent`. El cobro objetivo es la copia tomada al ABRIR:
 * tras cancelar, la fila pasa a `Cancelado` y puede salir de un filtro de
 * estatus; el diálogo sigue hablando del mismo cobro mientras se cierra.
 */
export function CollectionCancelDialog({ cobro, open, onOpenChange }: CollectionCancelDialogProps) {
  const queryClient = useQueryClient();
  return (
    <CancelReasonDialogFor
      target={cobro}
      content={(target) => cobroCancelDialogContent(queryClient, target)}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
