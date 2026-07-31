"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ScissorsIcon } from "@/src/components/Icons";
import { EmbroideryOrderCreateForm } from "./EmbroideryOrderCreateForm";

interface EmbroideryOrderFormProps {
  /** Ver `EmbroideryOrderCreateFormProps.onViewExistingOrder` — solo se
   *  reenvía, este componente no lo usa directamente. */
  onViewExistingOrder: (id: number) => void;
  /**
   * Cierra el diálogo de detalle que este formulario pudo haber abierto desde
   * el aviso de duplicado. Se invoca al cerrar el alta: sin esto el detalle
   * —que vive en `EmbroideryView`, no aquí dentro— quedaría abierto sobre la
   * tabla ya sin el formulario que le dio contexto.
   */
  onCloseExistingOrder: () => void;
}

/**
 * Punto de entrada del alta de orden de bordado: botón del toolbar que abre el
 * formulario de un solo paso.
 *
 * El contenido —y con él la llamada al onboarding— solo se monta cuando el
 * diálogo está abierto, y se re-monta limpio en cada apertura (sin pedido ni
 * observaciones residuales). Mismo patrón que `DispatchForm`/`PackingForm`.
 */
export const EmbroideryOrderForm = ({
  onViewExistingOrder,
  onCloseExistingOrder,
}: EmbroideryOrderFormProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open);
        // Al cerrar el alta se cierra también el detalle que se haya abierto
        // desde el aviso de duplicado; abrirla de nuevo tampoco debe arrastrar
        // el diálogo de una sesión anterior del formulario.
        if (!open) onCloseExistingOrder();
      }}
      title={
        <DialogHeader
          title="Nueva Orden de Bordado"
          subtitle="Genera la orden a partir de un pedido con prendas por bordar"
          statusColor="sky"
        />
      }
      maxWidth="640px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <ScissorsIcon className="w-4 h-4" />
          Nueva orden
        </Button>
      }
    >
      {isDialogOpen && (
        <EmbroideryOrderCreateForm
          onSuccess={() => setIsDialogOpen(false)}
          onViewExistingOrder={onViewExistingOrder}
        />
      )}
    </MainDialog>
  );
};
