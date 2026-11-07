"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Loader } from "@/src/components/Loader";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useQuoteBoard } from "../hooks/useQuoteBoard";
import { useSubmitQuoteForReview } from "../hooks/useSubmitQuoteForReview";
import { validateQuoteForReviewMutationKey } from "../hooks/useValidateQuoteForReview";
import { useQuoteReviewValidationFlow } from "../hooks/useQuoteReviewValidationFlow";
import { Quote } from "../interfaces/quote.interface";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { KanbanToolbar } from "@/src/components/KanbanToolbar";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { QuoteKanbanColumn } from "./QuoteKanbanColumn";
import { KANBAN_COLUMNS, KanbanColumnConfig } from "../constants/kanbanColumns";
import { QuoteKanbanCard } from "./QuoteKanbanCard";
import { QuoteReviewValidationDialog } from "./QuoteReviewValidationDialog";
import { QuoteSubmitForReviewDialog } from "./QuoteSubmitForReviewDialog";
import {
  isQuoteReviewableStatus,
  PENDING_AUTHORIZATION_QUOTE_STATUS,
} from "../utils/quoteStatusRules";
import { QuoteRowActionDialogs } from "./QuoteRowActionDialogs";
import { QuoteRowActionsProvider, useQuoteRowActions } from "../hooks/useQuoteRowActions";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { plural } from "@/src/utils/plural";
import { ErrorState } from "@/src/components/ErrorState";

// ─── Tipos locales ────────────────────────────────────────────────────────────
/** Datos del arrastre pendiente de confirmación */
interface PendingDrop {
  quote: Quote;
  sourceEstatus: number;
  targetEstatus: number;
  targetLabel: string;
  targetConfig: KanbanColumnConfig;
}

// ─── Componente ───────────────────────────────────────────────────────────────
/**
 * Tablero de cotizaciones en MODO SERVIDOR (`useQuoteBoard`): `tablero/` trae
 * el total y las primeras filas de cada estatus, y cada columna carga más con
 * el listado. La búsqueda viaja como `q`. Las columnas se leen SIEMPRE de la
 * caché (no hay copia local), así que cualquier invalidación de `["quotes"]`
 * —también las autorizaciones de Mesa de Control— se ve aunque antes se haya
 * arrastrado una tarjeta.
 */
export function QuoteKanbanBoard() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const board = useQuoteBoard(debouncedSearch);
  const { data: session } = useSession();

  // ─── Mutación de envío a revisión ────────────────────────────────────────
  const submitQuoteForReviewMutation = useSubmitQuoteForReview();
  const {
    reviewValidationErrors,
    isReviewValidationDialogOpen,
    setIsReviewValidationDialogOpen,
    validationQuoteId,
    validateBeforeSendToReview,
  } = useQuoteReviewValidationFlow();
  const isValidatingReview =
    useIsMutating({ mutationKey: validateQuoteForReviewMutationKey }) > 0;

  // ─── Acciones del menú de cada card ──────────────────────────────────────
  // El TABLERO es dueño de mutaciones y diálogos (ver `useQuoteRowActions`);
  // el flujo de validación de arriba es el del ARRASTRE, independiente.
  // `onAction`/`busy` bajan a `QuoteCardActions` por contexto
  // (`QuoteRowActionsProvider`), sin atravesar columna ni card.
  const {
    onAction: onCardAction,
    busy: cardBusy,
    dialogs: cardDialogs,
  } = useQuoteRowActions();

  // ─── Estado local del tablero ─────────────────────────────────────────────
  // Solo lo del arrastre: las columnas viven en la caché de `useQuoteBoard`.
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  // Copia del arrastre al abrir el diálogo: al confirmar o cancelar,
  // `pendingDrop` pasa a null pero el diálogo sigue en pantalla durante su
  // animación de salida, con el mismo texto y la misma forma (con o sin
  // comentario).
  const dropDialog = useDialogSession(!!pendingDrop, pendingDrop);
  const [returningId, setReturningId] = useState<number | null>(null);

  // Refs para controlar el diálogo de confirmación sin race conditions
  const dropConfirmedRef = useRef(false);
  const returningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpieza del timer al desmontar el componente
  useEffect(() => {
    return () => {
      if (returningTimerRef.current) clearTimeout(returningTimerRef.current);
    };
  }, []);

  const triggerReturnAnimation = useCallback((quoteId: number) => {
    setReturningId(quoteId);
    if (returningTimerRef.current) clearTimeout(returningTimerRef.current);
    returningTimerRef.current = setTimeout(() => setReturningId(null), 800);
  }, []);

  // Permisos. "+ Nueva cotización" usa el código de ALTA, no el de lectura de
  // la sección: ver el tablero (`R-CRM-COTIZACIONES`, lo exige la ruta) no
  // habilita a crear.
  const canCreateQuote = hasPermission("C-CRM-COTIZACIONES", session?.user);

  // ─── Total del servidor con la búsqueda vigente (suma de las columnas) ───
  const visibleTotal = board.columns.reduce((acc, column) => acc + column.total, 0);

  // ─── Handler: inicio de arrastre ─────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    if (isValidatingReview) return;
    const sourceId = event.operation.source?.id;
    if (!sourceId) return;
    setActiveQuote(board.loadedRows.find((q) => String(q.id) === String(sourceId)) ?? null);
  };

  // ─── Handler: fin de arrastre ─────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveQuote(null);
    if (event.canceled) return;
    if (isValidatingReview) return;

    const sourceId = event.operation.source?.id;
    const targetId = event.operation.target?.id;
    if (!sourceId || !targetId) return;

    // Solo se permite soltar en la columna "Por Autorizar" (estatus 2)
    const targetCol = KANBAN_COLUMNS.find(
      (c) => c.id === String(targetId) && c.estatus === PENDING_AUTHORIZATION_QUOTE_STATUS
    );
    if (!targetCol) return;

    const sourceColumn = board.columns.find((column) =>
      column.rows.some((q) => String(q.id) === String(sourceId))
    );
    const movedQuote = sourceColumn?.rows.find((q) => String(q.id) === String(sourceId));
    if (!movedQuote || !sourceColumn) return;
    if (sourceColumn.estatus === targetCol.estatus) return;
    // Solo se mueven las que pueden enviarse a revisión: Borrador (1) y
    // Rechazada (4). Desde 4 el diálogo ofrece el comentario opcional.
    if (!isQuoteReviewableStatus(sourceColumn.estatus)) return;

    const validationStatus = await validateBeforeSendToReview(movedQuote.id);
    if (validationStatus !== "valid") {
      triggerReturnAnimation(movedQuote.id);
      return;
    }

    // Mostrar diálogo de confirmación antes de aplicar el cambio
    setPendingDrop({
      quote: movedQuote,
      sourceEstatus: sourceColumn.estatus,
      targetEstatus: targetCol.estatus,
      targetLabel: targetCol.label,
      targetConfig: targetCol,
    });
  };

  // ─── Confirmar el arrastre: actualización optimista + mutación ────────────
  // La tarjeta se mueve en la CACHÉ del tablero, con los conteos de las dos
  // columnas (`moveQuote`); al terminar, `useSubmitQuoteForReview` invalida
  // `["quotes"]` y el servidor reconcilia. Si falla, se restaura lo de antes.
  const handleDropConfirm = async (comentario?: string) => {
    if (!pendingDrop) return;
    dropConfirmedRef.current = true;

    const { quote: movedQuote, sourceEstatus, targetEstatus, targetLabel } = pendingDrop;
    setPendingIds((prev) => new Set(prev).add(movedQuote.id));
    setPendingDrop(null);

    const clearPending = () =>
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(movedQuote.id);
        return next;
      });

    const rollback = await board.moveQuote(movedQuote, sourceEstatus, {
      estatus: targetEstatus,
      label: targetLabel,
    });
    submitQuoteForReviewMutation.mutate({ id: movedQuote.id, comentario }, {
      onSuccess: clearPending,
      onError: () => {
        rollback();
        clearPending();
      },
    });
  };

  // ─── Cancelar el arrastre: animar la tarjeta de regreso a su columna ──────
  const handleDropDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (!dropConfirmedRef.current && pendingDrop) {
        // El usuario canceló — activar la animación de retorno
        const quoteId = pendingDrop.quote.id;
        setPendingDrop(null);
        triggerReturnAnimation(quoteId);
      }
      dropConfirmedRef.current = false;
    }
  };

  // ─── Estado de carga ───────────────────────────────────────────────────────
  if (board.isLoading) {
    return (
      <div className="flex flex-col gap-4 mt-6">
        <div className="h-10 w-full max-w-sm rounded-xl bg-slate-200/70 dark:bg-white/5 animate-pulse" />
        <div
          className="grid grid-cols-2 gap-4 lg:grid-cols-5"
          role="status"
          aria-live="polite"
          aria-label="Cargando tablero"
        >
          {KANBAN_COLUMNS.map((col) => (
            <LoadingSkeleton key={col.id} className="h-64 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Carga inicial fallida ─────────────────────────────────────────────────
  // Solo si el tablero nunca cargó: sin esto se pintaba con todas las columnas
  // vacías, igual que si no hubiera cotizaciones. Un refetch fallido conserva
  // las tarjetas y avisa por toast desde `useQuoteBoard`.
  if (board.isInitialError) {
    return (
      <div className="mt-6">
        <ErrorState
          title="Error al cargar cotizaciones"
          message={extractErrorMessage(board.error, "No se pudo cargar la información.")}
        />
      </div>
    );
  }

  return (
    <QuoteRowActionsProvider value={{ onAction: onCardAction, busy: cardBusy }}>
    <div
      className="mt-6 flex flex-col gap-4"
      aria-label="Tablero de cotizaciones"
      aria-busy={isValidatingReview || board.isTransitioning}
    >
      {/* Barra de herramientas */}
      <KanbanToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por #, OC o cliente..."
        actionButton={
          canCreateQuote ? (
            <Link
              href="/sales/quotes/new"
              aria-label="Crear nueva cotización"
              className="inline-flex items-center justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/30 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-200 ease-in-out"
            >
              + Nueva cotización
            </Link>
          ) : undefined
        }
      />

      {/* Info de resultados */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {visibleTotal}
          </span>{" "}
          {plural(visibleTotal, "cotización", "cotizaciones")}
          {debouncedSearch && (
            <span className="text-slate-400 dark:text-slate-500"> con la búsqueda</span>
          )}
          {" "}— arrastra las cotizaciones en <strong>Borrador</strong> o <strong>Rechazada</strong> a <strong>Por Autorizar</strong> para enviar a revisión
        </p>
        {pendingIds.size > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium ml-auto flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Guardando {pendingIds.size} {plural(pendingIds.size, "cambio", "cambios")}…
          </span>
        )}
      </div>

      {/* Proveedor DnD — el wrapper relativo acota el overlay de validación a esta sección */}
      <div className="relative">
      <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Columnas horizontales con scroll — items-stretch iguala la altura a la columna más larga */}
        <div
          className={[
            "flex items-stretch gap-4 overflow-x-auto pb-4 snap-x snap-mandatory transition-opacity",
            board.isTransitioning ? "opacity-60" : "",
          ].join(" ")}
          role="list"
          aria-label="Columnas del tablero"
        >
          {KANBAN_COLUMNS.map((col, index) => (
            <div key={col.id} className="snap-start flex flex-col" role="listitem">
              <QuoteKanbanColumn
                // Otra búsqueda vuelve a la primera página de cada columna.
                key={`${col.id}-${debouncedSearch}`}
                config={col}
                column={board.columns[index]}
                pendingIds={pendingIds}
                returningId={returningId}
                isInteractionDisabled={isValidatingReview}
              />
            </div>
          ))}
        </div>

        {/* Overlay de arrastre */}
        <DragOverlay dropAnimation={null}>
          {activeQuote ? (
            <div className="rotate-1 scale-105 shadow-2xl shadow-black/20 rounded-2xl">
              <QuoteKanbanCard quote={activeQuote} isOverlay isInteractionDisabled={isValidatingReview} />
            </div>
          ) : null}
        </DragOverlay>
      </DragDropProvider>

      {isValidatingReview && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-slate-50/80 dark:bg-black/70 backdrop-blur-[2px]">
          <Loader
            title="Validando cotización"
            message="Estamos validando la cotización antes de enviarla a revisión."
          />
        </div>
      )}
      </div>

      {/* Diálogo de confirmación para arrastre col-1/col-4 → col-2. Desde 4
          es el mismo diálogo de reenvío (con comentario) que el del menú. */}
      {dropDialog.snapshot && (
        <QuoteSubmitForReviewDialog
          key={dropDialog.id}
          open={!!pendingDrop}
          onOpenChange={handleDropDialogOpenChange}
          quoteId={dropDialog.snapshot.quote.id}
          estatus={dropDialog.snapshot.sourceEstatus}
          description={`La cotización #${dropDialog.snapshot.quote.id} pasará a "${dropDialog.snapshot.targetLabel}". Mientras esté en ese estado no podrá editarse. ¿Deseas continuar?`}
          onConfirm={handleDropConfirm}
        />
      )}
      <QuoteReviewValidationDialog
        open={isReviewValidationDialogOpen}
        onOpenChange={setIsReviewValidationDialogOpen}
        quoteId={validationQuoteId ?? pendingDrop?.quote.id ?? 0}
        errors={reviewValidationErrors}
      />
      <QuoteRowActionDialogs loadedRows={board.loadedRows} {...cardDialogs} />

    </div>
    </QuoteRowActionsProvider>
  );
}
