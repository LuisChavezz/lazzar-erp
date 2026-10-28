"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import SupplierForm from "./SupplierForm";
import { Supplier } from "../interfaces/supplier.interface";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = alta; un proveedor = edición. */
  supplierToEdit: Supplier | null;
  onSuccess: () => void;
}

/**
 * Diálogo de alta/edición de proveedor. Compartido por el listado
 * (`SupplierList`, alta y edición) y la página de detalle
 * (`SupplierDetailContent`, solo edición), para que ambos abran exactamente el
 * mismo formulario.
 *
 * Trabaja con la copia tomada al ABRIR (`useDialogSession`): el listado pone su
 * proveedor en `null` al cerrar, y sin la copia el diálogo pasaría a "Nuevo
 * Proveedor" durante la animación de salida. Cada apertura monta un formulario
 * nuevo (`key`).
 */
export default function SupplierFormDialog({
  open,
  onOpenChange,
  supplierToEdit,
  onSuccess,
}: SupplierFormDialogProps) {
  const session = useDialogSession(open, supplierToEdit);
  const isEditing = Boolean(session.snapshot?.id);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="860px"
      title={
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
              {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h1>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
              </span>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isEditing ? "Edición de proveedor" : "Alta de proveedor"}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <SupplierForm key={session.id} onSuccess={onSuccess} supplierToEdit={session.snapshot} />
    </MainDialog>
  );
}
