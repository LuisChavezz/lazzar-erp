"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { BomStepManager } from "./BomStepManager";

interface CreateBomDialogProps {
  /** Whether the dialog is open. Owned by the parent. */
  open: boolean;
  /** Called when the dialog requests to open/close. */
  onOpenChange: (open: boolean) => void;
}

/**
 * CreateBomDialog
 *
 * Controlled dialog for creating a new lista de materiales (BOM). It does not
 * own its open state — the parent passes `open` / `onOpenChange`. Renders the
 * onboarding wizard (`BomStepManager`), which drives the step progress bar and
 * per-step content.
 */
export function CreateBomDialog({ open, onOpenChange }: CreateBomDialogProps) {
  return (
    <MainDialog
      title={
        <DialogHeader
          title="Nuevos Materiales de Producto Variante"
          subtitle="Seleccionar variante de producto"
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={true}
    >
      <BomStepManager onClose={() => onOpenChange(false)} />
    </MainDialog>
  );
}
