"use client";

import { useIsMutating } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import { SAMPLE_SKU_ONBOARDING_MUTATION_KEY } from "../hooks/useCreateSampleSkuOnboarding";
import { SampleSkuOnboardingStepManager } from "./SampleSkuOnboardingStepManager";

interface SampleSkuOnboardingDialogProps {
  pedidoId: number;
  open: boolean;
  /**
   * Línea de muestra a dar de alta. Sigue llegando mientras el diálogo anima
   * su cierre, para que no se vea vacío; la página la suelta en `onClosed`.
   */
  line: SpecialOrderLine | null;
  onClose: () => void;
  /** El diálogo ya terminó de cerrarse (animación incluida). */
  onClosed: () => void;
}

/**
 * Diálogo del alta de SKU de producción + lista de materiales de una línea de
 * muestra. Controlado: el estado lo tiene `SpecialOrderPageContent`, no la
 * tarjeta de la línea, que cambia de "Generar" a "SKU generados" al terminar.
 *
 * Cada apertura arranca limpia porque la página le cambia la `key`. El `open`
 * y la línea llegan por separado: al cerrar, el contenido se queda montado
 * hasta que termina la animación de salida. Con el alta en curso el diálogo no
 * se deja cerrar (X o Escape): la petición seguiría viva sin nadie que muestre
 * su resultado.
 */
export function SampleSkuOnboardingDialog({
  pedidoId,
  open,
  line,
  onClose,
  onClosed,
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
      // Sin línea (un refetch dejó de traerla) no hay nada que mostrar.
      open={open && line !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) onClose();
      }}
      onCloseAutoFocus={onClosed}
      maxWidth="640px"
      showCloseButton={false}
    >
      {line && (
        <SampleSkuOnboardingStepManager
          pedidoId={pedidoId}
          line={line}
          onClose={onClose}
        />
      )}
    </MainDialog>
  );
}
