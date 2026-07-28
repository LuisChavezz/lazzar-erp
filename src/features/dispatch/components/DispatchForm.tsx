"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { EmbarquesIcon } from "@/src/components/Icons";
import { DispatchCreateForm } from "./DispatchCreateForm";

/**
 * Punto de entrada de la captura de despacho: botón que abre el formulario de
 * un solo paso (elegir packing → marcar líneas → registrar; ver
 * `DispatchCreateForm` para por qué no es un asistente por pasos).
 *
 * El contenido —y con él las llamadas al onboarding— solo se monta cuando el
 * diálogo está abierto, y se re-monta limpio en cada apertura (sin packing ni
 * casillas residuales). Mismo patrón que `PackingForm`/`PickingForm`.
 */
export const DispatchForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nuevo Despacho"
          subtitle="Entrega de cajas empacadas para su envío"
          statusColor="sky"
        />
      }
      maxWidth="820px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <EmbarquesIcon className="w-4 h-4" />
          Nuevo despacho
        </Button>
      }
    >
      {isDialogOpen && <DispatchCreateForm onSuccess={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
