"use client";

import { useIsMutating } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import { SAMPLE_SKU_ONBOARDING_MUTATION_KEY } from "../hooks/useCreateSampleSkuOnboarding";
import { SampleSkuOnboardingStepManager } from "./SampleSkuOnboardingStepManager";

interface SampleSkuOnboardingDialogProps {
  pedidoId: number;
  /** Línea de muestra a dar de alta; `null` = diálogo cerrado. */
  line: SpecialOrderLine | null;
  onClose: () => void;
}

/**
 * Diálogo del alta de SKU de producción + lista de materiales de una línea de
 * muestra. Controlado: el estado lo tiene `SpecialOrderPageContent`, no la
 * tarjeta de la línea, que cambia de "Generar" a "SKU generados" al terminar.
 *
 * El asistente solo se monta con una línea, así que cada apertura arranca
 * limpia. Con el alta en curso el diálogo no se deja cerrar (X o Escape): la
 * petición seguiría viva sin nadie que muestre su resultado.
 */
export function SampleSkuOnboardingDialog({
  pedidoId,
  line,
  onClose,
}: SampleSkuOnboardingDialogProps) {
  const isSubmitting = useIsMutating({ mutationKey: SAMPLE_SKU_ONBOARDING_MUTATION_KEY }) > 0;

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Generar SKU y BOM"
          subtitle={line?.producto_nombre_externo || "Línea de muestra"}
          statusColor="sky"
        />
      }
      open={line !== null}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
      maxWidth="640px"
      showCloseButton={false}
    >
      {line && (
        <SampleSkuOnboardingStepManager
          key={line.id}
          pedidoId={pedidoId}
          line={line}
          onClose={onClose}
        />
      )}
    </MainDialog>
  );
}
