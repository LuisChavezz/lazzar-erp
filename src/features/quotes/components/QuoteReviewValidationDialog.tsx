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
import { EditIcon, ErrorIcon } from "@/src/components/Icons";
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
      showCloseButton={false}
      title={
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 shrink-0">
            <ErrorIcon className="w-5 h-5 text-amber-500" />
          </span>
          <div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Cotización incompleta
            </p>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
              Resuelve los siguientes puntos antes de enviar a revisión
            </p>
          </div>
        </div>
      }
      actionButton={
        <Button variant="primary" leftIcon={<EditIcon className="w-4 h-4" />} onClick={handleGoToEdit}>
          Ir a editar
        </Button>
      }
      actionButtonClose={false}
    >
      {/* Lista de errores */}
      <ul className="mt-1 mb-2 space-y-2">
        {errors.map((error, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-xl border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3"
          >
            {/* Indicador visual */}
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 leading-tight">
                {error.field}
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5 leading-snug">
                {error.message}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </MainDialog>
  );
}
