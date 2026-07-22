"use client";

import { useQuoteEditForm } from "../hooks/useQuoteEditForm";
import { QuoteFormContent } from "./QuoteForm";

interface QuoteEditFormProps {
  quoteId: number;
}

// Componente de edición de cotización.
// Delega toda la lógica a useQuoteEditForm y reutiliza QuoteFormContent para el JSX.
export function QuoteEditForm({ quoteId }: QuoteEditFormProps) {
  const { quoteLoadFailed, isQuoteRetrying, retryQuoteLoad, ...formProps } =
    useQuoteEditForm(quoteId);

  /* Fallo TÉCNICO al cargar la cotización (500, red, timeout — nunca 404/403,
   * que redirigen al listado desde el hook): estado terminal con reintento en
   * vez del loader infinito de QuoteFormContent, que no distingue "cargando"
   * de "la consulta ya falló". */
  if (quoteLoadFailed) {
    return (
      <div className="w-full pt-2">
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            No se pudo cargar la cotización.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ocurrió un problema técnico al consultar el servidor. Intenta de nuevo.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => retryQuoteLoad()}
              disabled={isQuoteRetrying}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isQuoteRetrying ? "Reintentando…" : "Reintentar"}
            </button>
            <a
              href="/sales/quotes"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
            >
              Volver a cotizaciones
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <QuoteFormContent {...formProps} submitLabel="Guardar Cambios" />;
}
