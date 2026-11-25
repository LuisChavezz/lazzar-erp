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
 */
export function SalidaMaquilaActions({ salida }: { salida: SalidaMaquilaListItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Cancelar salida
      </Button>
      <CancelReasonDialog content={salidaMaquilaCancelDialogContent(salida)} open={open} onOpenChange={setOpen} />
    </div>
  );
}
