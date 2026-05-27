"use client";

import { useState, useMemo, useTransition, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import Link from "next/link";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Loader } from "@/src/components/Loader";
import { useQuotes } from "../hooks/useQuotes";
import { useQuoteFilters } from "../hooks/useQuoteFilters";
import { useSubmitQuoteForReview } from "../hooks/useSubmitQuoteForReview";
import { validateQuoteForReviewMutationKey } from "../hooks/useValidateQuoteForReview";
import { useQuoteReviewValidationFlow } from "../hooks/useQuoteReviewValidationFlow";
import { useQuoteFiltersStore, QuoteFiltersValue } from "../stores/quote-filters.store";
import { Quote } from "../interfaces/quote.interface";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { KanbanToolbar } from "@/src/components/KanbanToolbar";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { QuoteKanbanColumn } from "./QuoteKanbanColumn";
import { KANBAN_COLUMNS, KanbanColumnConfig } from "../constants/kanbanColumns";
import { QuoteKanbanCard } from "./QuoteKanbanCard";
import { QuoteReviewValidationDialog } from "./QuoteReviewValidationDialog";
import { hasPermission } from "@/src/utils/permissions";

// ─── Carga diferida del diálogo de filtros ────────────────────────────────────
const QuoteFiltersDialog = lazy(() =>
  import("./QuoteFiltersDialog").then((mod) => ({ default: mod.QuoteFiltersDialog }))
);

// ─── Tipos locales ────────────────────────────────────────────────────────────
type ColumnMap = Record<number, Quote[]>;
/** Datos del arrastre pendiente de confirmación */
interface PendingDrop {
  quote: Quote;
  sourceEstatus: number;
  targetEstatus: number;
  targetLabel: string;
  targetConfig: KanbanColumnConfig;
}
// ─── Inicializa el mapa de columnas desde el array plano de cotizaciones ───────
function buildColumnMap(quotes: Quote[]): ColumnMap {
  const map: ColumnMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const quote of quotes) {
    const key = quote.estatus in map ? quote.estatus : 1;
    map[key].push(quote);
  }
  return map;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function QuoteKanbanBoard() {
  const { quotes, isLoading } = useQuotes();
  const { data: session } = useSession();
  const filtersHydrated = useQuoteFiltersStore((state) => state.hasHydrated);

  // ─── Filtros del store (misma lógica que QuoteList) ───────────────────────
  const {
    filters,
    filteredOrders,
    hasActiveFilters,
    applyFilters,
    clearFilters,
    savedFilters,
    saveFilters,
    clearSavedFilters,
    personaPagosOptions,
  } = useQuoteFilters(quotes);

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

  // ─── Estado local del tablero ─────────────────────────────────────────────
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [, startTransition] = useTransition();

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

  // Permisos
  const canCreateOrder = hasPermission("R-CRM", session?.user);

  // ─── IDs filtrados por el store (fuente de verdad para filtros avanzados) ──
  const filteredIds = useMemo(
    () => new Set(filteredOrders.map((q) => q.id)),
    [filteredOrders]
  );

  // ─── Mapa de columnas resuelto: DnD + filtros + búsqueda ─────────────────
  const resolvedMap = useMemo<ColumnMap>(() => {
    // Base: posiciones DnD si existen, si no las del servidor
    const base = columnMap ?? buildColumnMap(quotes);
    const q = searchQuery.trim().toLowerCase();

    const result: ColumnMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const [key, cards] of Object.entries(base)) {
      result[Number(key)] = cards.filter(
        (c) =>
          filteredIds.has(c.id) &&
          (!q ||
            c.cliente_nombre?.toLowerCase().includes(q) ||
            c.cliente_razon_social?.toLowerCase().includes(q) ||
            String(c.id).includes(q) ||
            (c.oc?.toLowerCase().includes(q) ?? false))
      );
    }
    return result;
  }, [columnMap, quotes, filteredIds, searchQuery]);

  // ─── Total visible (sumando todas las columnas ya filtradas) ──────────────
  const visibleTotal = useMemo(
    () => Object.values(resolvedMap).reduce((acc, col) => acc + col.length, 0),
    [resolvedMap]
  );

  // ─── Handlers de filtros ──────────────────────────────────────────────────
  const handleApplyFilters = useCallback(
    (value: QuoteFiltersValue) => {
      applyFilters(value);
      // Reinicia posiciones DnD para que reflejen los nuevos filtros
      setColumnMap(null);
      setIsFiltersOpen(false);
    },
    [applyFilters]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setColumnMap(null);
  }, [clearFilters]);

  // ─── Handler: inicio de arrastre ─────────────────────────────────────────
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (isValidatingReview) return;
      const sourceId = event.operation.source?.id;
      if (!sourceId) return;
      const found = quotes.find((q) => String(q.id) === String(sourceId)) ?? null;
      setActiveQuote(found);
    },
    [isValidatingReview, quotes]
  );

  // ─── Handler: fin de arrastre ─────────────────────────────────────────────
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveQuote(null);
      if (event.canceled) return;
      if (isValidatingReview) return;

      const sourceId = event.operation.source?.id;
      const targetId = event.operation.target?.id;
      if (!sourceId || !targetId) return;

      // Solo se permite soltar en la columna "Por Autorizar" (estatus 2)
      const targetCol = KANBAN_COLUMNS.find(
        (c) => c.id === String(targetId) && c.estatus === 2
      );
      if (!targetCol) return;

      const currentMap = columnMap ?? buildColumnMap(quotes);
      let movedQuote: Quote | undefined;
      let sourceColEstatus: number | undefined;

      for (const [estatusKey, cards] of Object.entries(currentMap)) {
        const found = cards.find((q) => String(q.id) === String(sourceId));
        if (found) {
          movedQuote = found;
          sourceColEstatus = Number(estatusKey);
          break;
        }
      }

      if (!movedQuote || sourceColEstatus === undefined) return;
      if (sourceColEstatus === targetCol.estatus) return;
      // Solo las cotizaciones en Borrador (estatus 1) pueden moverse
      if (sourceColEstatus !== 1) return;

      const validationStatus = await validateBeforeSendToReview(movedQuote.id);
      if (validationStatus !== "valid") {
        triggerReturnAnimation(movedQuote.id);
        return;
      }

      // Mostrar diálogo de confirmación antes de aplicar el cambio
      setPendingDrop({
        quote: movedQuote,
        sourceEstatus: sourceColEstatus,
        targetEstatus: targetCol.estatus,
        targetLabel: targetCol.label,
        targetConfig: targetCol,
      });
    },
    [columnMap, isValidatingReview, quotes, triggerReturnAnimation, validateBeforeSendToReview]
  );

  // ─── Confirmar el arrastre: actualización optimista + mutación ────────────
  const handleDropConfirm = useCallback(() => {
    if (!pendingDrop) return;
    dropConfirmedRef.current = true;

    const { quote: movedQuote, sourceEstatus, targetEstatus, targetLabel } = pendingDrop;
    const currentMap = columnMap ?? buildColumnMap(quotes);

    const nextMap: ColumnMap = {
      ...currentMap,
      [sourceEstatus]: currentMap[sourceEstatus].filter((q) => q.id !== movedQuote.id),
      [targetEstatus]: [
        ...currentMap[targetEstatus],
        { ...movedQuote, estatus: targetEstatus, estatus_label: targetLabel },
      ],
    };

    startTransition(() => setColumnMap(nextMap));
    setPendingIds((prev) => new Set(prev).add(movedQuote.id));
    setPendingDrop(null);

    submitQuoteForReviewMutation.mutate(movedQuote.id, {
      onSuccess: () => {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(movedQuote.id);
          return next;
        });
      },
      onError: () => {
        // Revertir al mapa anterior en caso de error
        setColumnMap(currentMap);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(movedQuote.id);
          return next;
        });
      },
    });
  }, [pendingDrop, columnMap, quotes, submitQuoteForReviewMutation]);

  // ─── Cancelar el arrastre: animar la tarjeta de regreso a su columna ──────
  const handleDropDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (!dropConfirmedRef.current && pendingDrop) {
          // El usuario canceló — activar la animación de retorno
          const quoteId = pendingDrop.quote.id;
          setPendingDrop(null);
          triggerReturnAnimation(quoteId);
        }
        dropConfirmedRef.current = false;
      }
    },
    [pendingDrop, triggerReturnAnimation]
  );

  // ─── Estado de carga ───────────────────────────────────────────────────────
  if (isLoading || !filtersHydrated) {
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

  return (
    <div
      className="mt-6 flex flex-col gap-4"
      aria-label="Tablero de cotizaciones"
      aria-busy={isValidatingReview}
    >
      {/* Barra de herramientas */}
      <KanbanToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar cotización..."
        onFiltersClick={() => setIsFiltersOpen(true)}
        isFiltersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        actionButton={
          canCreateOrder ? (
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
          {visibleTotal === 1 ? "cotización" : "cotizaciones"}
          {(hasActiveFilters || searchQuery) && (
            <span className="text-slate-400 dark:text-slate-500">
              {" "}de{" "}
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {quotes.length}
              </span>{" "}
              totales
            </span>
          )}
          {" "}— arrastra las cotizaciones en <strong>Borrador</strong> a <strong>Por Autorizar</strong> para enviar a revisión
        </p>
        {pendingIds.size > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium ml-auto flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Guardando {pendingIds.size} {pendingIds.size === 1 ? "cambio" : "cambios"}…
          </span>
        )}
      </div>

      {/* Proveedor DnD — el wrapper relativo acota el overlay de validación a esta sección */}
      <div className="relative">
      <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Columnas horizontales con scroll — items-stretch iguala la altura a la columna más larga */}
        <div
          className="flex items-stretch gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
          role="list"
          aria-label="Columnas del tablero"
        >
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.id} className="snap-start flex flex-col" role="listitem">
              <QuoteKanbanColumn
                config={col}
                quotes={resolvedMap[col.estatus] ?? []}
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

      {/* Diálogo de confirmación para arrastre col-1 → col-2 */}
      <ConfirmDialog
        open={!!pendingDrop}
        onOpenChange={handleDropDialogOpenChange}
        title="Enviar a revisión"
        description={
          pendingDrop
            ? `La cotización #${pendingDrop.quote.id} pasará a "${pendingDrop.targetLabel}". Mientras esté en ese estado no podrá editarse. ¿Deseas continuar?`
            : ""
        }
        confirmText="Enviar a revisión"
        cancelText="Cancelar"
        confirmColor="blue"
        onConfirm={handleDropConfirm}
      />
      <QuoteReviewValidationDialog
        open={isReviewValidationDialogOpen}
        onOpenChange={setIsReviewValidationDialogOpen}
        quoteId={validationQuoteId ?? pendingDrop?.quote.id ?? 0}
        errors={reviewValidationErrors}
      />

      {/* Diálogo de filtros (carga diferida) */}
      <Suspense fallback={null}>
        {isFiltersOpen && (
          <QuoteFiltersDialog
            open={isFiltersOpen}
            onOpenChange={setIsFiltersOpen}
            value={filters}
            onApply={handleApplyFilters}
            onSave={saveFilters}
            onClearSaved={clearSavedFilters}
            savedValue={savedFilters}
            personaPagosOptions={personaPagosOptions}
          />
        )}
      </Suspense>
    </div>
  );
}

