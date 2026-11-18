"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useSalidaMaquilaActions } from "../hooks/useSalidaMaquilaMutations";
import { salidaMaquilaFolio } from "../constants/salidaMaquilaOrigen";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";

type Pending = "cerrar" | "cancelar" | null;

/**
 * "Marcar recibida" (WMS recibió y pasó calidad) y "Cancelar". Solo se monta
 * para una SM ENVIADA y con permiso de producción.
 */
export function SalidaMaquilaActions({ salida }: { salida: SalidaMaquilaListItem }) {
  const { cerrar, cancelar } = useSalidaMaquilaActions(salida.id);
  const [pending, setPending] = useState<Pending>(null);
  const busy = cerrar.isPending || cancelar.isPending;
  const folio = salidaMaquilaFolio(salida);

  const run = (which: "cerrar" | "cancelar") =>
    (which === "cerrar" ? cerrar : cancelar).mutate(undefined, { onSettled: () => setPending(null) });

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" disabled={busy} onClick={() => setPending("cancelar")}>
        Cancelar salida
      </Button>
      <Button type="button" variant="success" disabled={busy} onClick={() => setPending("cerrar")}>
        Marcar recibida
      </Button>

      <ConfirmDialog
        open={pending === "cerrar"}
        onOpenChange={(open) => !open && !busy && setPending(null)}
        title={`¿Recibir ${folio}?`}
        description={`Confirma que almacén recibió las ${salida.total_piezas} piezas de ${salida.centro_confeccion_nombre} y que pasaron calidad. Ya no se podrá cancelar.`}
        confirmText={cerrar.isPending ? "Guardando…" : "Sí, recibida"}
        confirmColor="green"
        closeOnConfirm={false}
        busy={cerrar.isPending}
        onConfirm={() => run("cerrar")}
      />
      <ConfirmDialog
        open={pending === "cancelar"}
        onOpenChange={(open) => !open && !busy && setPending(null)}
        title={`¿Cancelar ${folio}?`}
        description="Las piezas vuelven a quedar disponibles para otra salida de la misma orden. No se puede deshacer."
        confirmText={cancelar.isPending ? "Cancelando…" : "Sí, cancelar"}
        confirmColor="red"
        closeOnConfirm={false}
        busy={cancelar.isPending}
        onConfirm={() => run("cancelar")}
      />
    </div>
  );
}
