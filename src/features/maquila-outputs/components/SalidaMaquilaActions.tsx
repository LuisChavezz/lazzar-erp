"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useCancelarSalidaMaquila } from "../hooks/useSalidaMaquilaMutations";
import { salidaMaquilaFolio } from "../constants/salidaMaquilaOrigen";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";

/**
 * "Cancelar" una SM ENVIADA, con permiso de producción. No hay "recibir" aquí:
 * desde nucleo-erp #1217 la SM queda Recibida al recepcionarla en WMS, y
 * `cerrar/` responde siempre 400.
 */
export function SalidaMaquilaActions({ salida }: { salida: SalidaMaquilaListItem }) {
  const cancelar = useCancelarSalidaMaquila(salida.id);
  const [confirming, setConfirming] = useState(false);
  const busy = cancelar.isPending;
  const folio = salidaMaquilaFolio(salida);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirming(true)}>
        Cancelar salida
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !open && !busy && setConfirming(false)}
        title={`¿Cancelar ${folio}?`}
        description="Las piezas vuelven a quedar disponibles para otra salida de la misma orden. No se puede deshacer."
        confirmText={busy ? "Cancelando…" : "Sí, cancelar"}
        confirmColor="red"
        closeOnConfirm={false}
        busy={busy}
        onConfirm={() => cancelar.mutate(undefined, { onSettled: () => setConfirming(false) })}
      />
    </div>
  );
}
