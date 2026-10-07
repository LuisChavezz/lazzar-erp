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
 */

import { useState } from "react";
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
import { InvoiceOnboardingStep2 } from "./InvoiceOnboardingStep2";

interface CreateInvoiceDialogProps {
  /** Si el diálogo está abierto. Lo controla el padre. */
  open: boolean;
  /** Solicita abrir/cerrar el diálogo. */
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
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
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
    >
      <CreateInvoiceWizard />
    </MainDialog>
  );
}

function CreateInvoiceWizard() {
  const [currentStep, setCurrentStep] = useState<InvoiceWizardStep>(INVOICE_WIZARD_STEPS[0]);
  const [pedidoId, setPedidoId] = useState(0);

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
          <InvoiceOrderSelector selectedOrderId={pedidoId} onSelect={setPedidoId} />
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
          onBack={() => setCurrentStep("step-1")}
        />
      )}
    </div>
  );
}
