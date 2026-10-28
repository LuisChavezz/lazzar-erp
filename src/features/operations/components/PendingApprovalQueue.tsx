"use client";

import { useMemo, useState } from "react";
import { useMutationState } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import toast from "react-hot-toast";
import { getSavedMontosError } from "@/src/features/quotes/utils/quoteAmounts";
import {
  formatQuoteAmountOrDash,
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
import { rejectOperationsQuoteMutationKey } from "@/src/features/operations/hooks/useRejectOperationsQuote";
import { RejectQuoteDialog } from "@/src/features/operations/components/RejectQuoteDialog";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import { useDialogSession } from "@/src/hooks/useDialogSession";
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
  "sky" | "emerald" | "amber" | "rose" | "orange"
> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
  5: "orange",
};

const MAX_VISIBLE = 6;

export const PendingApprovalQueue = () => {
  const { operationsQuotes, isLoading } = useOperationsQuotes();
  const approveOperationsQuote = useApproveOperationsQuote();
  const rejectingOperationsQuoteIds = useMutationState({
    filters: { mutationKey: [...rejectOperationsQuoteMutationKey], status: "pending" },
    select: selectMutationRecordId,
  });

  const [processingOperationsQuoteIds, setProcessingOperationsQuoteIds] =
    useState<Set<number>>(new Set());
  const [activeOperationsQuote, setActiveOperationsQuote] =
    useState<OperationsQuote | null>(null);
  const [pendingOperationsQuoteAction, setPendingOperationsQuoteAction] =
    useState<{
      type: "approve" | "reject";
      operationsQuote: OperationsQuote;
    } | null>(null);
  // Rechazo: copia de la cotización tomada al abrir; el diálogo sigue montado
  // (anima al cerrar) aunque la fila salga de la cola.
  const isRejectOpen = pendingOperationsQuoteAction?.type === "reject";
  const rejectSession = useDialogSession(
    isRejectOpen,
    isRejectOpen ? pendingOperationsQuoteAction.operationsQuote : null
  );

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

  // Solo AUTORIZAR pasa por aquí. Rechazar lo resuelve `RejectQuoteDialog`,
  // que sigue abierto hasta que el backend responde (motivo obligatorio y su
  // error bajo el campo); su "en curso" se lee de la caché de mutaciones.
  const handleConfirmApprove = () => {
    if (pendingOperationsQuoteAction?.type !== "approve") return;

    const { operationsQuote } = pendingOperationsQuoteAction;
    // Mismas reglas de montos que el backend revisa al autorizar (EC-563,
    // CO-03): se avisan aquí en vez de mandar una petición que va a rechazar.
    const montosError = getSavedMontosError(operationsQuote);
    if (montosError) {
      setPendingOperationsQuoteAction(null);
      toast.error(montosError);
      return;
    }
    markProcessing(operationsQuote.id);
    setPendingOperationsQuoteAction(null);

    approveOperationsQuote.mutate(operationsQuote.id, {
      onSettled: () => unmarkProcessing(operationsQuote.id),
    });
  };

  return (
    <>
      <section
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col"
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
              {isLoading ? (
                <div className="mt-1 w-40" aria-hidden="true">
                  <LoadingSkeleton className="h-3 rounded-full" />
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {pendingOperationsQuotes.length === 0
                    ? "Sin pendientes · todo al día"
                    : `${pendingOperationsQuotes.length} cotización${pendingOperationsQuotes.length !== 1 ? "es" : ""} esperando revisión`}
                </p>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="w-6" aria-hidden="true">
              <LoadingSkeleton className="h-6 rounded-full" />
            </div>
          ) : pendingOperationsQuotes.length > 0 ? (
            <span className="flex items-center justify-center min-w-6 h-6 rounded-full text-[11px] font-bold bg-amber-500 text-white px-1.5 animate-pulse">
              {pendingOperationsQuotes.length}
            </span>
          ) : null}
        </div>

        <div className="max-h-128 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: MAX_VISIBLE }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-18 rounded-xl" />
              ))}
            </div>
          ) : visibleOperationsQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
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
                const isProcessing =
                  processingOperationsQuoteIds.has(operationsQuote.id) ||
                  rejectingOperationsQuoteIds.includes(operationsQuote.id);

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
                        <span className="text-[11px] font-bold font-mono tracking-wider text-sky-600 dark:text-sky-400">
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
                        {formatQuoteAmountOrDash(operationsQuote.gran_total, operationsQuote.moneda_codigo)}
                      </p>
                      {operationsQuote.piezas != null && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {operationsQuote.piezas} pzs
                        </p>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          >
                            <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Autorizar</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Rechazar cotización #${String(operationsQuote.id).padStart(5, "0")}`}
                            onClick={() =>
                              handleRequestAction("reject", operationsQuote)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <RejectIcon className="w-4 h-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Rechazar</span>
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
              title={`Detalles de la cotización #${activeOperationsQuote.id}`}
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
          <OperationsQuoteDetails
            quoteId={activeOperationsQuote.id}
            source="mesa-control"
          />
        </MainDialog>
      )}

      <ConfirmDialog
        open={pendingOperationsQuoteAction?.type === "approve"}
        onOpenChange={(open) => {
          if (!open) setPendingOperationsQuoteAction(null);
        }}
        title="Autorizar cotización operativa"
        description={
          pendingOperationsQuoteAction
            ? `¿Confirmas autorizar la cotización #${String(
                pendingOperationsQuoteAction.operationsQuote.id
              ).padStart(5, "0")} de ${
                pendingOperationsQuoteAction.operationsQuote.cliente_nombre
              }?`
            : ""
        }
        onConfirm={handleConfirmApprove}
        confirmText="Autorizar"
        cancelText="Cancelar"
        confirmColor="green"
      />
      {rejectSession.snapshot && (
        <RejectQuoteDialog
          key={rejectSession.id}
          open={isRejectOpen}
          quote={rejectSession.snapshot}
          onClose={() => setPendingOperationsQuoteAction(null)}
        />
      )}
    </>
  );
};

