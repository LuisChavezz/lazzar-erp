"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatCurrency } from "@/src/utils/formatCurrency";
import {
  formatQuoteDateTime as formatOperationsQuoteDateTime,
} from "@/src/features/quotes/utils/quoteDetailsFormatters";
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
import { useApproveOperationsQuote } from "@/src/features/operations/hooks/useApproveOperationsQuote";
import { useRejectOperationsQuote } from "@/src/features/operations/hooks/useRejectOperationsQuote";
import { useOperationsQuotes } from "@/src/features/operations/hooks/useOperationsQuotes";
import type { OperationsQuote } from "@/src/features/operations/interfaces/operations-quote.interface";

const OperationsQuoteDetails = dynamic(
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

const OPERATIONS_QUOTE_DIALOG_COLORS: Record<
  number,
  "sky" | "emerald" | "amber" | "rose"
> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

const MAX_VISIBLE = 6;

export const PendingApprovalQueue = () => {
  const { operationsQuotes, isLoading } = useOperationsQuotes();
  const approveOperationsQuote = useApproveOperationsQuote();
  const rejectOperationsQuote = useRejectOperationsQuote();

  const [processingOperationsQuoteIds, setProcessingOperationsQuoteIds] =
    useState<Set<number>>(new Set());
  const [activeOperationsQuote, setActiveOperationsQuote] =
    useState<OperationsQuote | null>(null);
  const [pendingOperationsQuoteAction, setPendingOperationsQuoteAction] =
    useState<{
      type: "approve" | "reject";
      operationsQuote: OperationsQuote;
    } | null>(null);

  const pendingOperationsQuotes = useMemo(
    () =>
      operationsQuotes
        .filter((operationsQuote) => operationsQuote.estatus === 2)
        .sort(
          (firstOperationsQuote, secondOperationsQuote) =>
            new Date(firstOperationsQuote.created_at).getTime() -
            new Date(secondOperationsQuote.created_at).getTime()
        ),
    [operationsQuotes]
  );

  const visibleOperationsQuotes = pendingOperationsQuotes.slice(0, MAX_VISIBLE);
  const remainingOperationsQuotes =
    pendingOperationsQuotes.length - MAX_VISIBLE;

  const markProcessing = (id: number) =>
    setProcessingOperationsQuoteIds((prev) => new Set(prev).add(id));

  const unmarkProcessing = (id: number) =>
    setProcessingOperationsQuoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const handleRequestAction = (
    type: "approve" | "reject",
    operationsQuote: OperationsQuote
  ) => {
    setActiveOperationsQuote(null);
    setPendingOperationsQuoteAction({ type, operationsQuote });
  };

  const handleConfirm = () => {
    if (!pendingOperationsQuoteAction) return;

    const { type, operationsQuote } = pendingOperationsQuoteAction;
    markProcessing(operationsQuote.id);
    setPendingOperationsQuoteAction(null);

    if (type === "approve") {
      approveOperationsQuote.mutate(operationsQuote.id, {
        onSettled: () => unmarkProcessing(operationsQuote.id),
      });
      return;
    }

    rejectOperationsQuote.mutate(operationsQuote.id, {
      onSettled: () => unmarkProcessing(operationsQuote.id),
    });
  };

  return (
    <>
      <section
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col h-full"
        aria-label="Cola de cotizaciones operativas pendientes de autorización"
      >
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
                  {pendingOperationsQuotes.length === 0
                    ? "Sin pendientes · todo al día"
                    : `${pendingOperationsQuotes.length} cotización${pendingOperationsQuotes.length !== 1 ? "es" : ""} esperando revisión`}
                </p>
              )}
            </div>
          </div>

          {pendingOperationsQuotes.length > 0 && (
            <span className="flex items-center justify-center min-w-6 h-6 rounded-full text-[11px] font-bold bg-amber-500 text-white px-1.5 animate-pulse">
              {pendingOperationsQuotes.length}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : visibleOperationsQuotes.length === 0 ? (
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
              {visibleOperationsQuotes.map((operationsQuote) => {
                const isProcessing = processingOperationsQuoteIds.has(
                  operationsQuote.id
                );

                return (
                  <div
                    key={operationsQuote.id}
                    role="button"
                    tabIndex={isProcessing ? -1 : 0}
                    aria-label={`Ver detalles de cotización #${String(operationsQuote.id).padStart(5, "0")} de ${operationsQuote.cliente_nombre}`}
                    onClick={() =>
                      !isProcessing && setActiveOperationsQuote(operationsQuote)
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || isProcessing) {
                        return;
                      }

                      setActiveOperationsQuote(operationsQuote);
                    }}
                    className={[
                      "flex items-center gap-4 px-6 py-3.5 transition-colors",
                      isProcessing
                        ? "opacity-50 pointer-events-none bg-slate-50/50 dark:bg-white/1"
                        : "hover:bg-slate-50/60 dark:hover:bg-white/2 cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                          #{String(operationsQuote.id).padStart(5, "0")}
                        </span>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatOperationsQuoteDateTime(
                            operationsQuote.created_at,
                            "d MMM yyyy"
                          )}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {operationsQuote.cliente_nombre}
                      </p>
                      {operationsQuote.oc && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          OC: {operationsQuote.oc}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200">
                        {formatCurrency(Number(operationsQuote.gran_total) || 0)}
                      </p>
                      {operationsQuote.piezas != null && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {operationsQuote.piezas} pzs
                        </p>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {isProcessing ? (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-amber-500 animate-spin" />
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={`Autorizar cotización #${String(operationsQuote.id).padStart(5, "0")}`}
                            onClick={() =>
                              handleRequestAction("approve", operationsQuote)
                            }
                            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 transition-all cursor-pointer"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Rechazar cotización #${String(operationsQuote.id).padStart(5, "0")}`}
                            onClick={() =>
                              handleRequestAction("reject", operationsQuote)
                            }
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

        {remainingOperationsQuotes > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-white/6 bg-slate-50/50 dark:bg-white/2 shrink-0">
            <Link
              href="/operations/quotes"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              Ver {remainingOperationsQuotes} más
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {activeOperationsQuote && (
        <MainDialog
          open={!!activeOperationsQuote}
          onOpenChange={(open) => {
            if (!open) setActiveOperationsQuote(null);
          }}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles del pedido #${activeOperationsQuote.id}`}
              subtitle={
                activeOperationsQuote.cliente_nombre ||
                activeOperationsQuote.cliente_razon_social
              }
              statusColor={
                OPERATIONS_QUOTE_DIALOG_COLORS[activeOperationsQuote.estatus] ??
                "sky"
              }
            />
          }
        >
          <OperationsQuoteDetails quoteId={activeOperationsQuote.id} />
        </MainDialog>
      )}

      <ConfirmDialog
        open={!!pendingOperationsQuoteAction}
        onOpenChange={(open) => {
          if (!open) setPendingOperationsQuoteAction(null);
        }}
        title={
          pendingOperationsQuoteAction?.type === "approve"
            ? "Autorizar cotización operativa"
            : "Rechazar cotización operativa"
        }
        description={
          pendingOperationsQuoteAction
            ? `¿Confirmas ${
                pendingOperationsQuoteAction.type === "approve"
                  ? "autorizar"
                  : "rechazar"
              } la cotización #${String(
                pendingOperationsQuoteAction.operationsQuote.id
              ).padStart(5, "0")} de ${
                pendingOperationsQuoteAction.operationsQuote.cliente_nombre
              }?`
            : ""
        }
        onConfirm={handleConfirm}
        confirmText={
          pendingOperationsQuoteAction?.type === "approve"
            ? "Autorizar"
            : "Rechazar"
        }
        cancelText="Cancelar"
        confirmColor={
          pendingOperationsQuoteAction?.type === "approve" ? "green" : "red"
        }
      />
    </>
  );
};

