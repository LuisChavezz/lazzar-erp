"use client";

import { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/react";
import { Quote } from "../interfaces/quote.interface";
import { QuoteKanbanCard } from "./QuoteKanbanCard";
import { ColumnPaginator } from "./ColumnPaginator";
import { KanbanColumnConfig } from "../constants/kanbanColumns";

// ─── Reexporta para compatibilidad con importadores existentes ─────────────────
export type { KanbanColumnConfig };
export { KANBAN_COLUMNS } from "../constants/kanbanColumns";

// ─── Tamaño de página por columna ─────────────────────────────────────────────
const PAGE_SIZE = 4;

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteKanbanColumnProps {
  config: KanbanColumnConfig;
  quotes: Quote[];  /** IDs de cotizaciones con mutación pendiente (actualización de estatus en curso) */
  pendingIds?: Set<number>;}

// ─── Componente ───────────────────────────────────────────────────────────────
export function QuoteKanbanColumn({ config, quotes, pendingIds }: QuoteKanbanColumnProps) {
  const { ref, isDropTarget } = useDroppable({ id: config.id });
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(quotes.length / PAGE_SIZE));

  // Clamp derivado en lugar de useEffect — evita cascadas de render
  const currentPage = Math.min(page, totalPages - 1);

  const pageSlice = useMemo(
    () => quotes.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [quotes, currentPage]
  );

  const hasPagination = quotes.length > PAGE_SIZE;

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

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
          className={["absolute left-0 top-0 bottom-0 w-0.75", config.accentDot].join(" ")}
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
          aria-label={`${quotes.length} cotizaciones`}
        >
          {quotes.length}
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
        {quotes.length === 0 ? (
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
          pageSlice.map((quote) => (
            <QuoteKanbanCard
              key={quote.id}
              quote={quote}
              isPending={pendingIds?.has(quote.id) ?? false}
            />
          ))
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

