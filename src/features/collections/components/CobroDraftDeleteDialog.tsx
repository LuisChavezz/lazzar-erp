"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useDeleteCobroDraft } from "../hooks/useDeleteCobroDraft";
import type { Cobro } from "../interfaces/collection.interface";
import { cobroLabel } from "../utils/collection.utils";
import { CobroActionConfirmDialog } from "./CobroActionConfirmDialog";

/** Lo mínimo para eliminar y describir el borrador. */
export type CobroDraftDeleteTarget = Pick<Cobro, "id" | "folio">;

interface CobroDraftDeleteDialogProps {
  cobro: CobroDraftDeleteTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de "Eliminar" un borrador SIN folio (`DELETE`, ver
 * `useDeleteCobroDraft`). El cobro objetivo es la copia tomada al ABRIR
 * (`useDialogSession`): tras eliminarlo su fila desaparece y el texto debe
 * sobrevivir a la animación de cierre.
 *
 * El ciclo de cierre es el de `CobroActionConfirmDialog`.
 */
export function CobroDraftDeleteDialog({ cobro, open, onOpenChange }: CobroDraftDeleteDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const { remove, isDeleting } = useDeleteCobroDraft(target?.id ?? 0);

  return (
    <CobroActionConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Eliminar borrador"
      description={
        target
          ? `El borrador ${cobroLabel(target)} se eliminará por completo. No tiene folio ni movió saldos, banco o póliza. Esta acción no se puede deshacer.`
          : ""
      }
      confirmText="Eliminar borrador"
      busyText="Eliminando…"
      confirmColor="red"
      run={target ? remove : null}
      isRunning={isDeleting}
    />
  );
}
