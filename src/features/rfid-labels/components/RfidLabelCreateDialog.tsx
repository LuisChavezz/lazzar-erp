"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { PrinterIcon } from "@/src/components/Icons";
import { RfidLabelCreateStepManager } from "./RfidLabelCreateStepManager";

/**
 * Punto de entrada de "Nueva impresión" de etiquetas RFID: botón del toolbar que
 * abre el asistente de 2 pasos (buscar SKU/producto → configurar, imprimir y
 * registrar). El contenido —y con él las llamadas al onboarding y la detección
 * de Browser Print— solo se monta con el diálogo abierto, y se re-monta limpio
 * en cada apertura (sin estado residual del paso ni del preview).
 */
export const RfidLabelCreateDialog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nueva impresión"
          subtitle="Imprime y registra etiquetas RFID de un producto"
          statusColor="sky"
        />
      }
      maxWidth="720px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <PrinterIcon className="w-4 h-4" />
          Nueva impresión
        </Button>
      }
    >
      {isDialogOpen && (
        <RfidLabelCreateStepManager onClose={() => setIsDialogOpen(false)} />
      )}
    </MainDialog>
  );
};
