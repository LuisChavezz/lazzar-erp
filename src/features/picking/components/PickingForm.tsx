"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { RouteIcon } from "@/src/components/Icons";
import { PickingStepManager } from "./PickingStepManager";

/**
 * Punto de entrada de la captura de picking: botón que abre el asistente de 2
 * pasos (elegir pedido/almacén → surtir cantidades por talla). El contenido —y
 * con él las llamadas al onboarding— solo se monta cuando el diálogo está
 * abierto, y se re-monta limpio en cada apertura (sin estado residual del paso).
 */
export const PickingForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nuevo Picking"
          subtitle="Surtido parcial de un pedido por tallas"
          statusColor="sky"
        />
      }
      maxWidth="820px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <RouteIcon className="w-4 h-4" />
          Nuevo picking
        </Button>
      }
    >
      {isDialogOpen && <PickingStepManager onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
