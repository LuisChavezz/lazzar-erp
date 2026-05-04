"use client";

import { useState, useMemo, useTransition, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useSession } from "next-auth/react";
import { useQuotes } from "../hooks/useQuotes";
import { useQuoteFilters } from "../hooks/useQuoteFilters";
import { useUpdateQuoteStatus } from "../hooks/useUpdateQuoteStatus";
import { useQuoteFiltersStore, QuoteFiltersValue } from "../stores/quote-filters.store";
import { Quote } from "../interfaces/quote.interface";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { KanbanToolbar } from "@/src/components/KanbanToolbar";
import { QuoteKanbanColumn } from "./QuoteKanbanColumn";
import { KANBAN_COLUMNS } from "../constants/kanbanColumns";
import { QuoteKanbanCard } from "./QuoteKanbanCard";
import { hasPermission } from "@/src/utils/permissions";

// ─── Carga diferida del diálogo de filtros ────────────────────────────────────
const QuoteFiltersDialog = lazy(() =>
  import("./QuoteFiltersDialog").then((mod) => ({ default: mod.QuoteFiltersDialog }))
);

// ─── Tipos locales ────────────────────────────────────────────────────────────
type ColumnMap = Record<number, Quote[]>;

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

  // ─── Mutación de estatus ──────────────────────────────────────────────────
  const updateStatus = useUpdateQuoteStatus();

  // ─── Estado local del tablero ─────────────────────────────────────────────
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [, startTransition] = useTransition();

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
      const sourceId = event.operation.source?.id;
      if (!sourceId) return;
      const found = quotes.find((q) => String(q.id) === String(sourceId)) ?? null;
      setActiveQuote(found);
    },
    [quotes]
  );

  // ─── Handler: fin de arrastre ─────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveQuote(null);
      if (event.canceled) return;

      const sourceId = event.operation.source?.id;
      const targetId = event.operation.target?.id;
      if (!sourceId || !targetId) return;

      const targetCol = KANBAN_COLUMNS.find((c) => c.id === String(targetId));
      if (!targetCol) return;

      // Calcular el movimiento de forma síncrona para poder capturar el estado previo
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

      const quoteId = movedQuote.id;
      const prevMap = currentMap;

      const nextMap: ColumnMap = {
        ...currentMap,
        [sourceColEstatus]: currentMap[sourceColEstatus].filter(
          (q) => q.id !== movedQuote!.id
        ),
        [targetCol.estatus]: [
          ...currentMap[targetCol.estatus],
          { ...movedQuote, estatus: targetCol.estatus, estatus_label: targetCol.label },
        ],
      };

      // Aplicar actualización optimista
      startTransition(() => setColumnMap(nextMap));

      // Marcar cotización como pendiente y disparar mutación
      setPendingIds((prev) => new Set(prev).add(quoteId));

      updateStatus.mutate(
        { id: quoteId, estatus: targetCol.estatus },
        {
          onSuccess: () => {
            setPendingIds((prev) => {
              const next = new Set(prev);
              next.delete(quoteId);
              return next;
            });
          },
          onError: () => {
            // Revertir al estado anterior en caso de error
            setColumnMap(prevMap);
            setPendingIds((prev) => {
              const next = new Set(prev);
              next.delete(quoteId);
              return next;
            });
          },
        }
      );
    },
    [quotes, columnMap, updateStatus]
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
    <div className="mt-6 flex flex-col gap-4" aria-label="Tablero de cotizaciones">
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
          {" "}— arrastra las cards entre columnas para persistir el cambio de estatus
        </p>
        {pendingIds.size > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium ml-auto flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Guardando {pendingIds.size} {pendingIds.size === 1 ? "cambio" : "cambios"}…
          </span>
        )}
      </div>

      {/* Proveedor DnD */}
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
              />
            </div>
          ))}
        </div>

        {/* Overlay de arrastre */}
        <DragOverlay dropAnimation={null}>
          {activeQuote ? (
            <div className="rotate-1 scale-105 shadow-2xl shadow-black/20 rounded-2xl">
              <QuoteKanbanCard quote={activeQuote} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DragDropProvider>

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

