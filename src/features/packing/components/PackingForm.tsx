"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { PackingIcon } from "@/src/components/Icons";
import { PackingStepManager } from "./PackingStepManager";

/**
 * Punto de entrada de la captura de packing: botón que abre el asistente de 2
 * pasos (elegir picking origen → empacar líneas). El contenido —y con él las
 * llamadas al onboarding— solo se monta cuando el diálogo está abierto, y se
 * re-monta limpio en cada apertura (sin estado residual del paso). Mismo
 * patrón que `PickingForm`.
 */
export const PackingForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nuevo Packing"
          subtitle="Empaque de mercancía surtida por un picking"
          statusColor="sky"
        />
      }
      maxWidth="820px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <PackingIcon className="w-4 h-4" />
          Nuevo packing
        </Button>
      }
    >
      {isDialogOpen && <PackingStepManager onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
