"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { PurchaseOrderEditStepManager } from "./PurchaseOrderEditStepManager";

interface PurchaseOrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Orden a editar. Es opcional porque puede quedar momentáneamente sin valor
   * mientras el diálogo se cierra; el step manager solo se monta cuando existe.
   */
  initialData?: PurchaseOrder;
}

/**
 * Diálogo de edición de una orden de compra.
 *
 * Envuelve {@link PurchaseOrderEditStepManager} (wizard de 2 pasos: editar
 * encabezado → agregar productos y guardar) en un {@link MainDialog}
 * controlado. Reutiliza el mismo encabezado visual que el alta, con el título
 * "Editar Orden de Compra".
 */
export function PurchaseOrderEditDialog({
  open,
  onOpenChange,
  initialData,
}: PurchaseOrderEditDialogProps) {
  return (
    <MainDialog
      title={
        <DialogHeader
          title="Editar Orden de Compra"
          subtitle="Edición de orden"
          statusColor="amber"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={false}
    >
      {initialData ? (
        <PurchaseOrderEditStepManager
          initialData={initialData}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </MainDialog>
  );
}
