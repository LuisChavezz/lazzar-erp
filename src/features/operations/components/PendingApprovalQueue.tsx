"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuotes } from "@/src/features/quotes/hooks/useQuotes";
import { useApproveQuote } from "@/src/features/operations/hooks/useApproveQuote";
import { useRejectQuote } from "@/src/features/operations/hooks/useRejectQuote";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { formatQuoteDateTime } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import { hasPermission } from "@/src/utils/permissions";
import {
  CheckCircleIcon,
  RejectIcon,
  InboxIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";

// ─── Carga diferida del detalle de cotización ─────────────────────────────────
const QuoteDetails = dynamic(
  () =>
    import("@/src/features/quotes/components/QuoteDetails").then((mod) => ({
      default: mod.QuoteDetails,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="space-y-4"
        role="status"
        aria-live="polite"
        aria-label="Cargando detalles del pedido"
      >
        <div className="h-24 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-56 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-48 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
      </div>
    ),
  }
);

// ─── Colores del header del diálogo por estatus ───────────────────────────────
const STATUS_DIALOG_COLORS: Record<number, "sky" | "emerald" | "amber" | "rose"> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

// ─── Máximo de ítems visibles sin scroll ─────────────────────────────────────
const MAX_VISIBLE = 6;

// ─── Componente ───────────────────────────────────────────────────────────────
export const PendingApprovalQueue = () => {
  const { quotes, isLoading } = useQuotes();
  const { data: session } = useSession();
  const approveQuote = useApproveQuote();
  const rejectQuote = useRejectQuote();

  // Permisos — visible solo para R-MESACONTROL o admin
  const canManageAuthorization = hasPermission("R-MESACONTROL", session?.user);

  // IDs de cotizaciones con mutación en vuelo
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  // Cotización activa en el modal de detalle
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);
  // Acción de confirmación pendiente
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject";
    quote: Quote;
  } | null>(null);

  // ─── Cotizaciones filtradas: estatus 2, ordenadas por fecha (más antiguas primero) ──
  const pendingQuotes = useMemo(
    () =>
      quotes
        .filter((q) => q.estatus === 2)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [quotes]
  );

  const visible = pendingQuotes.slice(0, MAX_VISIBLE);
  const remaining = pendingQuotes.length - MAX_VISIBLE;

  // ─── Helpers de estado de procesamiento ──────────────────────────────────
  const markProcessing = (id: number) =>
    setProcessingIds((prev) => new Set(prev).add(id));

  const unmarkProcessing = (id: number) =>
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // ─── Solicitar acción: cierra el modal de detalle y abre el confirm ───────
  const handleRequestAction = (type: "approve" | "reject", quote: Quote) => {
    setViewQuote(null);
    setConfirmAction({ type, quote });
  };

  // ─── Confirmar acción ────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, quote } = confirmAction;
    markProcessing(quote.id);
    setConfirmAction(null);

    if (type === "approve") {
      approveQuote.mutate(quote.id, {
        onSettled: () => unmarkProcessing(quote.id),
      });
    } else {
      rejectQuote.mutate(quote.id, {
        onSettled: () => unmarkProcessing(quote.id),
      });
    }
  };

  return (
    <>
      <section
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col h-full"
        aria-label="Cola de cotizaciones pendientes de autorización"
      >
        {/* ── Encabezado ────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Cola de Autorización
              </h3>
              {!isLoading && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {pendingQuotes.length === 0
                    ? "Sin pendientes · todo al día"
                    : `${pendingQuotes.length} cotización${pendingQuotes.length !== 1 ? "es" : ""} esperando revisión`}
                </p>
              )}
            </div>
          </div>

          {/* Badge con conteo de urgencia */}
          {pendingQuotes.length > 0 && (
            <span className="flex items-center justify-center min-w-6 h-6 rounded-full text-[11px] font-bold bg-amber-500 text-white px-1.5 animate-pulse">
              {pendingQuotes.length}
            </span>
          )}
        </div>

        {/* ── Lista ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            /* Estado vacío */
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <InboxIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Todo al día
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center px-8">
                No hay cotizaciones pendientes de autorización en este momento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/6">
              {visible.map((quote) => {
                const isProcessing = processingIds.has(quote.id);

                return (
                  <div
                    key={quote.id}
                    role="button"
                    tabIndex={isProcessing ? -1 : 0}
                    aria-label={`Ver detalles de cotización #${String(quote.id).padStart(5, "0")} de ${quote.cliente_nombre}`}
                    onClick={() => !isProcessing && setViewQuote(quote)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !isProcessing && setViewQuote(quote)
                    }
                    className={[
                      "flex items-center gap-4 px-6 py-3.5 transition-colors",
                      isProcessing
                        ? "opacity-50 pointer-events-none bg-slate-50/50 dark:bg-white/1"
                        : "hover:bg-slate-50/60 dark:hover:bg-white/2 cursor-pointer",
                    ].join(" ")}
                  >
                    {/* ID + cliente */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                          #{String(quote.id).padStart(5, "0")}
                        </span>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatQuoteDateTime(quote.created_at, "d MMM yyyy")}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {quote.cliente_nombre}
                      </p>
                      {quote.oc && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          OC: {quote.oc}
                        </p>
                      )}
                    </div>

                    {/* Monto + piezas */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200">
                        {formatCurrency(Number(quote.gran_total) || 0)}
                      </p>
                      {quote.piezas != null && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {quote.piezas} pzs
                        </p>
                      )}
                    </div>

                    {/* Acciones o spinner — stopPropagation para no abrir el modal */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isProcessing ? (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-amber-500 animate-spin" />
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={`Autorizar cotización #${String(quote.id).padStart(5, "0")}`}
                            onClick={() => handleRequestAction("approve", quote)}
                            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 transition-all cursor-pointer"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Rechazar cotización #${String(quote.id).padStart(5, "0")}`}
                            onClick={() => handleRequestAction("reject", quote)}
                            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <RejectIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer "Ver más" ──────────────────────────────────────────── */}
        {remaining > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-white/6 bg-slate-50/50 dark:bg-white/2 shrink-0">
            <Link
              href="/operations/quotes"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              Ver {remaining} más
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Modal de detalle de cotización ──────────────────────────────── */}
      {viewQuote && (
        <MainDialog
          open={!!viewQuote}
          onOpenChange={(open) => {
            if (!open) setViewQuote(null);
          }}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles del pedido #${viewQuote.id}`}
              subtitle={viewQuote.cliente_nombre || viewQuote.cliente_razon_social}
              statusColor={STATUS_DIALOG_COLORS[viewQuote.estatus] ?? "sky"}
            />
          }
        >
          <QuoteDetails quoteId={viewQuote.id} />

          {/* ── Botones de autorización dentro del modal (solo R-MESACONTROL) ── */}
          {canManageAuthorization && viewQuote.estatus === 2 && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleRequestAction("reject", viewQuote)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
              >
                <RejectIcon className="w-4 h-4" />
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => handleRequestAction("approve", viewQuote)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 border border-emerald-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Autorizar
              </button>
            </div>
          )}
        </MainDialog>
      )}

      {/* ── Diálogo de confirmación ──────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "approve"
            ? "Autorizar cotización"
            : "Rechazar cotización"
        }
        description={
          confirmAction
            ? `¿Confirmas ${
                confirmAction.type === "approve" ? "autorizar" : "rechazar"
              } la cotización #${String(confirmAction.quote.id).padStart(5, "0")} de ${confirmAction.quote.cliente_nombre}?`
            : ""
        }
        onConfirm={handleConfirm}
        confirmText={
          confirmAction?.type === "approve" ? "Autorizar" : "Rechazar"
        }
        cancelText="Cancelar"
        confirmColor={confirmAction?.type === "approve" ? "green" : "red"}
      />
    </>
  );
};

