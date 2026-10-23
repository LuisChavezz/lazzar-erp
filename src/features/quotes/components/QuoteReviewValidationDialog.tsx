"use client";

/**
 * Diálogo de errores de validación para el flujo "Enviar a revisión".
 *
 * Se muestra cuando una cotización no pasa la validación previa al envío,
 * listando los problemas encontrados y ofreciendo acceso directo a la edición.
 */
import { useRouter } from "next/navigation";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { EditIcon } from "@/src/components/Icons";
import { QuoteValidationErrorList, QuoteValidationErrorsHeader } from "./QuoteValidationErrors";
import type { QuoteReviewValidationError } from "../utils/validateQuoteForReview";

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuoteReviewValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: number;
  errors: QuoteReviewValidationError[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function QuoteReviewValidationDialog({
  open,
  onOpenChange,
  quoteId,
  errors,
}: QuoteReviewValidationDialogProps) {
  const router = useRouter();

  const handleGoToEdit = () => {
    onOpenChange(false);
    router.push(`/sales/quotes/${quoteId}/edit`);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="520px"
      title={
        <QuoteValidationErrorsHeader
          title="Cotización incompleta"
          subtitle="Resuelve los siguientes puntos antes de enviar a revisión"
        />
      }
      actionButton={
        <Button variant="primary" leftIcon={<EditIcon className="w-4 h-4" />} onClick={handleGoToEdit}>
          Ir a editar
        </Button>
      }
      actionButtonClose={false}
    >
      <QuoteValidationErrorList errors={errors} />
    </MainDialog>
  );
}
