"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { RulerIcon } from "@/src/components/Icons";
import { ReflectiveOrderStepManager } from "./ReflectiveOrderStepManager";

interface ReflectiveOrderFormProps {
  /** Ver `ReflectiveOrderStep2Props.onViewExistingOrder` — solo se reenvía,
   *  este componente no lo usa directamente. */
  onViewExistingOrder: (id: number) => void;
  /**
   * Cierra el diálogo de detalle que este formulario pudo haber abierto desde
   * el aviso de duplicado. Se invoca al cerrar el alta: sin esto el detalle
   * —que vive en `ReflectiveOrdersView`, no aquí dentro— quedaría abierto sobre
   * la tabla ya sin el formulario que le dio contexto.
   */
  onCloseExistingOrder: () => void;
}

/**
 * Punto de entrada del alta de orden de reflejante: botón del toolbar que abre
 * el asistente de 2 pasos (encabezado → prendas y cantidades).
 *
 * El contenido —y con él la llamada al onboarding— solo se monta cuando el
 * diálogo está abierto, y se re-monta limpio en cada apertura (sin pedido,
 * observaciones ni selección de líneas residuales). Mismo patrón que
 * `EmbroideryOrderForm`/`PickingForm`.
 */
export const ReflectiveOrderForm = ({
  onViewExistingOrder,
  onCloseExistingOrder,
}: ReflectiveOrderFormProps) => {
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
          title="Nueva Orden de Reflejante"
          subtitle="Programa total o parcialmente las prendas por reflejar de un pedido"
          statusColor="sky"
        />
      }
      // 820px (no los 640px del alta de un solo paso): el Paso 2 lista una fila
      // por talla con casilla, nombre del producto, cantidades y stepper. Mismo
      // ancho que los asistentes de bordado y picking, que muestran una tabla
      // equivalente.
      maxWidth="820px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <RulerIcon className="w-4 h-4" />
          Nueva orden
        </Button>
      }
    >
      {isDialogOpen && (
        <ReflectiveOrderStepManager
          onClose={() => setIsDialogOpen(false)}
          onViewExistingOrder={onViewExistingOrder}
        />
      )}
    </MainDialog>
  );
};
