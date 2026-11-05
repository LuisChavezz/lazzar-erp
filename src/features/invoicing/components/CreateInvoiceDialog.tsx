"use client";

/**
 * CreateInvoiceDialog
 *
 * Asistente de **dos pasos** para facturar un pedido por piezas
 * (`/finanzas/facturas/onboarding/`):
 *  1. Elegir el pedido.
 *  2. Capturar las piezas por talla de ESTA factura (parcial y repetible: el
 *     pedido puede facturarse en varias parcialidades hasta agotar lo
 *     pendiente). La factura nace en estatus `Borrador`.
 *
 * El cuerpo vive en un componente interno que `MainDialog` monta como
 * `children`; al cerrarse, Radix lo desmonta y el estado (pedido elegido,
 * piezas capturadas, resultado) se reinicia al reabrir.
 *
 * No se cierra (X, Cerrar, Esc) mientras el alta viaja: el candado del envío
 * (`submitLockRef`, tomado de forma síncrona al pulsar "Crear factura") o la
 * mutación en vuelo (`queryClient.isMutating`, también síncrono) lo impiden.
 * Cerrar a medias escondería el folio de la factura creada.
 */

import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { Button } from "@/src/components/Button";
import {
  INVOICE_WIZARD_STEPS,
  INVOICE_WIZARD_STEP_LABELS,
  type InvoiceWizardStep,
} from "../constants/invoiceWizard";
import { InvoiceOrderSelector } from "./InvoiceOrderSelector";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import { InvoiceOnboardingStep2 } from "./InvoiceOnboardingStep2";
import { createInvoiceFromOnboardingMutationKey } from "../hooks/useCreateInvoiceFromOnboarding";

interface CreateInvoiceDialogProps {
  /** Si el diálogo está abierto. Lo controla el padre. */
  open: boolean;
  /** Solicita abrir/cerrar el diálogo. */
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  const queryClient = useQueryClient();
  // Candado del envío (ver `useInvoiceOnboardingStep2`): se lee en el handler,
  // no en render, así que vale desde el mismo clic.
  const submitLockRef = useRef(false);

  const handleOpenChange = (next: boolean) => {
    const creating =
      submitLockRef.current ||
      queryClient.isMutating({ mutationKey: createInvoiceFromOnboardingMutationKey }) > 0;
    if (!next && creating) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Nueva Factura"
          subtitle="Factura las piezas pendientes de un pedido"
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="760px"
      showCloseButton={true}
    >
      <CreateInvoiceWizard submitLockRef={submitLockRef} />
    </MainDialog>
  );
}

function CreateInvoiceWizard({ submitLockRef }: { submitLockRef: RefObject<boolean> }) {
  const [currentStep, setCurrentStep] = useState<InvoiceWizardStep>(INVOICE_WIZARD_STEPS[0]);
  // El pedido elegido COMPLETO (del listado), no solo su id: al regresar al
  // Paso 1 el selector lo fija arriba aunque la búsqueda ya no lo traiga.
  const [selectedOrder, setSelectedOrder] = useState<PedidoListItem | null>(null);
  const pedidoId = selectedOrder?.id ?? 0;
  // Moneda del pedido elegido (PK): el onboarding no la expone y la factura nace
  // en ella, así que el Paso 2 la usa para pintar el estimado.
  const monedaId = selectedOrder?.moneda ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <StepProgressBar
        steps={INVOICE_WIZARD_STEPS}
        currentStep={currentStep}
        labels={INVOICE_WIZARD_STEP_LABELS}
      />

      {currentStep === "step-1" && (
        <>
          {/* Selección de pedido sin <form>: Enter en la búsqueda no tiene
              envío implícito que prevenir. Avanzar no crea nada todavía. */}
          <InvoiceOrderSelector selectedOrder={selectedOrder} onSelect={setSelectedOrder} />
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              disabled={pedidoId <= 0}
              onClick={() => setCurrentStep("step-2")}
            >
              Continuar
            </Button>
          </div>
        </>
      )}

      {/* Se monta al entrar al Paso 2 y se desmonta al regresar: cada entrada
          recarga lo pendiente (ver `useInvoiceOnboarding`) y descarta lo
          capturado para otro pedido. */}
      {currentStep === "step-2" && (
        <InvoiceOnboardingStep2
          pedidoId={pedidoId}
          monedaId={monedaId}
          onBack={() => setCurrentStep("step-1")}
          submitLockRef={submitLockRef}
        />
      )}
    </div>
  );
}
