"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/src/components/Button";
import { BanIcon } from "@/src/components/Icons";
import { useCanCancelWmsDocuments } from "../hooks/useCanCancelWmsDocuments";
import { WmsCancelDialog, type WmsCancelDialogContent } from "./WmsCancelDialog";

interface WmsCancelHeaderActionsProps<TResult> {
  /**
   * ¿El documento admite la acción en su estado? (no cancelado; en una TR,
   * completada, sin ser reversa ni estar revertida). Las reglas de orden y de
   * cadena NO se repiten aquí: las aplica el backend.
   */
  available: boolean;
  /** "Cancelar" o "Revertir". */
  buttonLabel: string;
  content: WmsCancelDialogContent<TResult>;
  /** Las demás acciones del encabezado (el botón del PDF). */
  children?: ReactNode;
}

/**
 * Acciones del encabezado del detalle de un documento de WMS (EC-945): la
 * cancelación (o la reversa de una TR) junto a "Descargar PDF". Se ofrece solo
 * con `WMS-CANCELAR` (`useCanCancelWmsDocuments`) y si el documento la admite.
 *
 * El diálogo se monta aparte del botón, con el permiso: al cancelar, el botón
 * desaparece (el documento ya no la admite), pero el diálogo debe poder
 * cerrarse con su animación.
 */
export function WmsCancelHeaderActions<TResult>({
  available,
  buttonLabel,
  content,
  children,
}: WmsCancelHeaderActionsProps<TResult>) {
  const canCancel = useCanCancelWmsDocuments();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canCancel && available && (
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className="px-3! py-1.5! text-xs! text-rose-600! dark:text-rose-400!"
        >
          <BanIcon className="w-4 h-4" aria-hidden="true" />
          {buttonLabel}
        </Button>
      )}
      {children}
      {canCancel && <WmsCancelDialog content={content} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
