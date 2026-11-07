"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/react";
import { plural } from "@/src/utils/plural";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import type { QuoteBoardColumnState } from "../hooks/useQuoteBoard";
import { QuoteKanbanCard } from "./QuoteKanbanCard";
import { ColumnPaginator } from "./ColumnPaginator";
import { KanbanColumnConfig } from "../constants/kanbanColumns";
import { PENDING_AUTHORIZATION_QUOTE_STATUS } from "../utils/quoteStatusRules";

// ─── Reexporta para compatibilidad con importadores existentes ─────────────────
export type { KanbanColumnConfig };
export { KANBAN_COLUMNS } from "../constants/kanbanColumns";

// ─── Tamaño de página por columna ─────────────────────────────────────────────
// Presentación de 4 tarjetas por página SOBRE las filas cargadas; las tandas
// del servidor son de 20 (`QUOTE_BOARD_BATCH_SIZE`).
const PAGE_SIZE = 4;

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteKanbanColumnProps {
  config: KanbanColumnConfig;
  /** Total del servidor, filas cargadas y "cargar más" (`useQuoteBoard`). */
  column: QuoteBoardColumnState;
  /** IDs de cotizaciones con mutación pendiente (actualización de estatus en curso) */
  pendingIds?: Set<number>;
  /** ID de la cotización que regresa a la columna tras cancelar un arrastre */
  returningId?: number | null;
  /** Bloquea interacciones mientras se valida el envío a revisión */
  isInteractionDisabled?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function QuoteKanbanColumn({
  config,
  column,
  pendingIds,
  returningId,
  isInteractionDisabled = false,
}: QuoteKanbanColumnProps) {
  // Solo la columna "Por Autorizar" (estatus 2) acepta drops
  const { ref, isDropTarget } = useDroppable({
    id: config.id,
    disabled: isInteractionDisabled || config.estatus !== PENDING_AUTHORIZATION_QUOTE_STATUS,
  });
  const [page, setPage] = useState(0);
  const { rows, total } = column;

  // Las páginas cubren el TOTAL del servidor, no solo lo cargado: avanzar a
  // una página sin filas cargadas pide la siguiente tanda.
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Clamp derivado en lugar de useEffect — evita cascadas de render
  const currentPage = Math.min(page, totalPages - 1);

  const pageSlice = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  // La página pide filas que aún no están cargadas.
  const isPageIncomplete =
    pageSlice.length < PAGE_SIZE && rows.length < total && currentPage * PAGE_SIZE + pageSlice.length < total;

  const hasPagination = total > PAGE_SIZE;

  const handlePrev = () => setPage(Math.max(0, currentPage - 1));
  const handleNext = () => {
    const next = Math.min(totalPages - 1, currentPage + 1);
    if ((next + 1) * PAGE_SIZE > rows.length && column.canLoadMore) column.loadMore();
    setPage(next);
  };

  return (
    <div
      className="flex flex-col min-w-65 w-full max-w-[320px] shrink-0 h-full"
      aria-label={`Columna: ${config.label}`}
    >
      {/* ── Encabezado de columna ─────────────────────────────────────────── */}
      <div
        className={[
          "relative flex items-center justify-between px-4 py-3 rounded-2xl mb-3 overflow-hidden",
          "bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-white/10",
          "shadow-sm",
        ].join(" ")}
      >
        {/* Franja de color izquierda */}
        <span
          className={["absolute left-0 top-0 bottom-0 w-0.75", config.accentStripe].join(" ")}
          aria-hidden="true"
        />
        {/* Círculo de acento + etiqueta */}
        <div className="flex items-center gap-2.5">
          <div
            className={[
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
              config.accentBg,
            ].join(" ")}
            aria-hidden="true"
          >
            <span className={["w-2.5 h-2.5 rounded-full", config.accentDot].join(" ")} />
          </div>
          <h2 className={["text-sm font-semibold tracking-wide", config.accentText].join(" ")}>
            {config.label}
          </h2>
        </div>

        {/* Badge con conteo */}
        <span
          className={[
            "ml-2 min-w-5.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold text-center",
            config.badgeClass,
          ].join(" ")}
          aria-label={`${total} ${plural(total, "cotización", "cotizaciones")}`}
        >
          {total}
        </span>
      </div>

      {/* ── Paginación superior ───────────────────────────────────────────── */}
      {hasPagination && (
        <div className="mb-2">
          <ColumnPaginator
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
      )}

      {/* ── Zona de drop ──────────────────────────────────────────────────── */}
      <div
        ref={ref}
        className={[
          "flex-1 rounded-2xl p-2 space-y-2.5 transition-all duration-200 min-h-30",
          "border border-transparent",
          isDropTarget ? config.dropActiveClass : "",
        ].join(" ")}
      >
        {total === 0 && rows.length === 0 ? (
          <div
            className={[
              "flex items-center justify-center h-24 rounded-xl border-2 border-dashed",
              "text-xs text-slate-400 dark:text-slate-600 transition-colors duration-200",
              isDropTarget
                ? "border-slate-400/50 dark:border-slate-500"
                : "border-slate-200 dark:border-slate-700/50",
            ].join(" ")}
          >
            {isDropTarget ? "Soltar aquí" : "Sin cotizaciones"}
          </div>
        ) : (
          <>
            {pageSlice.map((quote) => (
              <QuoteKanbanCard
                key={quote.id}
                quote={quote}
                isPending={pendingIds?.has(quote.id) ?? false}
                isReturning={returningId === quote.id}
                isInteractionDisabled={isInteractionDisabled}
              />
            ))}
            {isPageIncomplete && column.isLoadingMore && (
              <div role="status" aria-label={`Cargando más cotizaciones de ${config.label}`}>
                <LoadingSkeleton className="h-24 rounded-2xl" />
              </div>
            )}
            {isPageIncomplete && column.loadMoreFailed && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                No se pudieron cargar más cotizaciones.{" "}
                <button
                  type="button"
                  onClick={column.retryLoadMore}
                  className="font-semibold underline cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            )}
            {isPageIncomplete && column.canLoadMore && (
              <button
                type="button"
                onClick={column.loadMore}
                className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              >
                Cargar más
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Paginación inferior ───────────────────────────────────────────── */}
      {hasPagination && (
        <div className="mt-2">
          <ColumnPaginator
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
      )}
    </div>
  );
}

