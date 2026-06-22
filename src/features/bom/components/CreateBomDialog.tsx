"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { BomStepManager } from "./BomStepManager";

interface CreateBomDialogProps {
  /** Whether the dialog is open. Owned by the parent. */
  open: boolean;
  /** Called when the dialog requests to open/close. */
  onOpenChange: (open: boolean) => void;
  /** Variante de producto para la que se crea la lista de materiales. */
  productoVarianteId: number;
  /** Called after the lista de materiales is created successfully. */
  onSuccess: () => void;
}

/**
 * CreateBomDialog
 *
 * Controlled dialog for creating a new lista de materiales (BOM). It does not
 * own its open state — the parent passes `open` / `onOpenChange`. The product
 * variant is fixed by the caller via `productoVarianteId`, so the wizard skips
 * variant selection and renders the 2-step flow (`BomStepManager`).
 */
export function CreateBomDialog({
  open,
  onOpenChange,
  productoVarianteId,
  onSuccess,
}: CreateBomDialogProps) {
  return (
    <MainDialog
      title={
        <DialogHeader
          title="Nuevos Materiales de Producto Variante"
          subtitle="Seleccionar y configurar materiales"
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={true}
    >
      <BomStepManager
        productoVarianteId={productoVarianteId}
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </MainDialog>
  );
}
