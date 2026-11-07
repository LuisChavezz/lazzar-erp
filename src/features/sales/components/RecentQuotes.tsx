"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import { OrderStatusPathIcon } from "@/src/components/Icons";
import { formatQuoteAmountOrDash } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import { useRecentQuotes } from "@/src/features/quotes/hooks/useRecentQuotes";
import { Quote } from "@/src/features/quotes/interfaces/quote.interface";
import { getStatusStyles } from "@/src/features/quotes/utils/getStatusStyle";
import { getQuoteDialogStatusColor } from "@/src/features/quotes/constants/quoteStatus";
import { DIALOG_WIDTH_DETAIL } from "@/src/constants/dialogWidths";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { PENDING_AUTHORIZATION_QUOTE_STATUS } from "@/src/features/quotes/utils/quoteStatusRules";
import { capitalize } from "@/src/utils/capitalize";

// Carga dinámica del componente de detalles de cotización para optimizar la carga inicial y evitar cargarlo si el usuario no interactúa con esa acción
const LazyQuoteDetails = dynamic(
  () => import("@/src/features/quotes/components/QuoteDetails").then((mod) => mod.QuoteDetails),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 min-h-112" role="status" aria-live="polite" aria-label="Cargando detalles de la cotización">
        <div className="h-24 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-56 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-48 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
      </div>
    ),
  }
);

const getStatusIconConfig = (status: number) => {
  if (status === 4) {
    return {
      iconClassName: "text-rose-500",
      iconPath: "M6 18L18 6M6 6l12 12",
    };
  }
  if (status === 3) {
    return {
      iconClassName: "text-emerald-500",
      iconPath: "M5 13l4 4L19 7",
    };
  }
  if (status === PENDING_AUTHORIZATION_QUOTE_STATUS) {
    return {
      iconClassName: "text-amber-500",
      iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    };
  }
  return {
    iconClassName: "text-amber-500",
    iconPath: "M12 6v6l4 2",
  };
};

export const RecentQuotes = () => {
  // Ya vienen ordenadas y recortadas por el backend (`?limit=3`, orden por
  // defecto: más reciente primero).
  const { quotes: recentQuotes, isLoading, isInitialError: isErrorQuotes } = useRecentQuotes();
  // La cotización elegida se guarda COMPLETA, no por id: la lista solo trae
  // las 3 más recientes, y un refetch (otra cotización creada) la sacaría de
  // ahí con el diálogo abierto. `useDialogSession` conserva la copia de la
  // apertura mientras el diálogo anima su cierre.
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const dialogSession = useDialogSession(selectedQuote !== null, selectedQuote);
  const dialogQuote = dialogSession.snapshot;

  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col h-full min-h-88">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Cotizaciones Recientes</h3>
        <Link
          href="/sales/quotes"
          aria-label="Ver todas las cotizaciones"
          className="text-xs text-sky-600 hover:text-sky-500 font-bold uppercase tracking-wider transition-colors"
        >
          Ver todos
        </Link>
      </div>
      <div className="flex-1 min-h-52 space-y-4">
        {isLoading ? (
          <>
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse" />
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse" />
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse" />
          </>
        ) : null}

        {!isLoading && !isErrorQuotes && recentQuotes.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-500 dark:text-slate-400">
            No hay cotizaciones recientes.
          </div>
        ) : null}

        {!isLoading && isErrorQuotes ? (
          <div className="rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200">
            No se pudieron cargar las cotizaciones recientes.
          </div>
        ) : null}

        {!isLoading &&
          !isErrorQuotes &&
          recentQuotes.map((quote: Quote) => {
            const statusClassName = getStatusStyles(quote);
            const icon = getStatusIconConfig(quote.estatus);

            return (
              <button
                key={quote.id}
                type="button"
                onClick={() => setSelectedQuote(quote)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-white/5">
                    <OrderStatusPathIcon className={`w-4 h-4 ${icon.iconClassName}`} path={icon.iconPath} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                      {`OC${quote.oc}` || `PED-${quote.id}`}
                    </div>
                    <div className="text-[10px] text-slate-500">{quote.cliente_razon_social}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatQuoteAmountOrDash(quote.gran_total, quote.moneda_codigo)}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${statusClassName}`}>
                    {capitalize(quote.estatus_label)}
                  </span>
                </div>
              </button>
            );
          })}
      </div>
      {dialogQuote ? (
        <MainDialog
          key={dialogSession.id}
          open={selectedQuote !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedQuote(null);
            }
          }}
          maxWidth={DIALOG_WIDTH_DETAIL}
          title={
            <DialogHeader
              title={`Detalles de la cotización #${dialogQuote.id}`}
              subtitle={dialogQuote.cliente_nombre || dialogQuote.cliente_razon_social || "Sin cliente"}
              statusColor={getQuoteDialogStatusColor(dialogQuote.estatus)}
            />
          }
        >
          <LazyQuoteDetails quoteId={dialogQuote.id} source="cotizaciones" />
        </MainDialog>
      ) : null}
    </section>
  );
};
