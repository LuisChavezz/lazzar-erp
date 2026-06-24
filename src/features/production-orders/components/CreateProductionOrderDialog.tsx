"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductionOrderStepManager } from "./ProductionOrderStepManager";

interface CreateProductionOrderDialogProps {
  /** Whether the dialog is open. Owned by the parent. */
  open: boolean;
  /** Called when the dialog requests to open/close. */
  onOpenChange: (open: boolean) => void;
  /** Called after the orden de producción is created successfully. */
  onSuccess: () => void;
}

/**
 * CreateProductionOrderDialog
 *
 * Diálogo controlado para crear una nueva orden de producción. No posee su
 * estado de apertura — el padre pasa `open` / `onOpenChange`. Renderiza el
 * asistente de 2 pasos (`ProductionOrderStepManager`).
 */
export function CreateProductionOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProductionOrderDialogProps) {
  return (
    <MainDialog
      title={
        <DialogHeader
          title="Nueva Orden de Producción"
          subtitle="Seleccionar y configurar productos"
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={true}
    >
      <ProductionOrderStepManager
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </MainDialog>
  );
}
