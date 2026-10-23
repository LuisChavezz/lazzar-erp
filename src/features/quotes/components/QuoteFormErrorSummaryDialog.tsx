"use client";

/**
 * Resumen de errores al Guardar el formulario de cotización/pedido.
 *
 * Mismas piezas que `QuoteReviewValidationDialog` (`QuoteValidationErrors`).
 * Al cerrarse, `onCloseAutoFocus` lleva la vista al primer campo con error
 * (ver `useQuoteSubmitErrorSummary`).
 */
import { MainDialog } from "@/src/components/MainDialog";
import { QuoteValidationErrorList, QuoteValidationErrorsHeader } from "./QuoteValidationErrors";
import type { QuoteReviewValidationError } from "../utils/validateQuoteForReview";

interface QuoteFormErrorSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  errors: QuoteReviewValidationError[];
}

export function QuoteFormErrorSummaryDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  errors,
}: QuoteFormErrorSummaryDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      maxWidth="520px"
      title={
        <QuoteValidationErrorsHeader
          title="No se pudo guardar"
          subtitle="Corrige los siguientes campos y vuelve a guardar"
        />
      }
    >
      <QuoteValidationErrorList errors={errors} className="max-h-80 overflow-y-auto" />
    </MainDialog>
  );
}
