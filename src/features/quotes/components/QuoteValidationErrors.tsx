/**
 * Piezas de presentación de los diálogos de errores de cotización: la
 * validación previa a "Enviar a revisión" (`QuoteReviewValidationDialog`) y el
 * resumen del Guardar (`QuoteFormErrorSummaryDialog`). Cada diálogo conserva su
 * texto, su acción y su comportamiento al cerrar.
 */
import { ErrorIcon } from "@/src/components/Icons";
import type { QuoteReviewValidationError } from "../utils/validateQuoteForReview";

interface QuoteValidationErrorsHeaderProps {
  title: string;
  subtitle: string;
}

/** Encabezado del diálogo: icono de aviso, título y subtítulo. */
export function QuoteValidationErrorsHeader({ title, subtitle }: QuoteValidationErrorsHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 shrink-0">
        <ErrorIcon className="w-5 h-5 text-amber-500" />
      </span>
      <div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

interface QuoteValidationErrorListProps {
  errors: QuoteReviewValidationError[];
  /** Clases extra de la lista (p. ej. un alto máximo con scroll). */
  className?: string;
}

/** Lista de errores: campo y mensaje por renglón. */
export function QuoteValidationErrorList({ errors, className = "" }: QuoteValidationErrorListProps) {
  return (
    <ul className={`mt-1 mb-2 space-y-2 ${className}`}>
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
  );
}
