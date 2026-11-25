"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { CancelReasonDialog } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { salidaMaquilaCancelDialogContent } from "../utils/salidaMaquilaCancelAction";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";

/**
 * "Cancelar" una SM ENVIADA, con permiso de producción, pidiendo el motivo que
 * el backend exige (nucleo-erp#1355, EC-948). No hay "recibir" aquí: desde
 * nucleo-erp #1217 la SM queda Recibida al recepcionarla en WMS, y `cerrar/`
 * responde siempre 400.
 *
 * `available` (`puedeCancelarSalidaMaquila`) solo decide el BOTÓN: el diálogo
 * se monta siempre, porque al cancelar (o cuando un `400` de negocio relee la
 * SM y ya no admite cancelarse) el botón desaparece, pero el diálogo debe
 * seguir mostrando su aviso y cerrarse con su animación.
 */
export function SalidaMaquilaActions({
  salida,
  available,
}: {
  salida: SalidaMaquilaListItem;
  available: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {available && (
        <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
          Cancelar salida
        </Button>
      )}
      <CancelReasonDialog content={salidaMaquilaCancelDialogContent(salida)} open={open} onOpenChange={setOpen} />
    </div>
  );
}
