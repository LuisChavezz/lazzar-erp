"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { BanIcon } from "@/src/components/Icons";
import { CancelReasonDialog } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { workOrderCancelDialogContent, type WorkOrderCancelConfig } from "../utils/workOrderCancelAction";

interface WorkOrderCancelButtonProps {
  /** ¿Tiene quien mira el código `D-` de la sección? Sin él no se monta nada. */
  canCancel: boolean;
  /**
   * ¿La orden admite cancelarse en su estatus? (`isEmbroideryOrderCancellable`,
   * `isWorkOrderCancellable`). El candado de la SM Enviada lo aplica el backend.
   */
  available: boolean;
  config: WorkOrderCancelConfig;
}

/**
 * "Cancelar orden" de la barra superior del detalle de una OB, OR u OCM
 * (EC-948), con el motivo que exige `cancelar/`. El diálogo se monta aparte del
 * botón, con el permiso: al cancelar, el botón desaparece (la orden ya no lo
 * admite), pero el diálogo debe poder cerrarse con su animación.
 */
export function WorkOrderCancelButton({ canCancel, available, config }: WorkOrderCancelButtonProps) {
  const [open, setOpen] = useState(false);
  if (!canCancel) return null;

  return (
    <>
      {available && (
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className="px-3! py-1.5! text-xs! text-rose-600! dark:text-rose-400!"
        >
          <BanIcon className="w-4 h-4" aria-hidden="true" />
          Cancelar orden
        </Button>
      )}
      <CancelReasonDialog content={workOrderCancelDialogContent(config)} open={open} onOpenChange={setOpen} />
    </>
  );
}
