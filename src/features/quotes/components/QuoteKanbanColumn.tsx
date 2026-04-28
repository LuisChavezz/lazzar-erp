"use client";

import { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/react";
import { Quote } from "../interfaces/quote.interface";
import { QuoteKanbanCard } from "./QuoteKanbanCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/src/components/Icons";

// ─── Tamaño de página por columna ─────────────────────────────────────────────
const PAGE_SIZE = 4;

// ─── Configuración de columnas ────────────────────────────────────────────────
export interface KanbanColumnConfig {
  id: string;
  estatus: number;
  label: string;
  /** Clases Tailwind para el encabezado/acento de la columna */
  headerAccent: string;
  /** Clases del badge numérico */
  badgeClass: string;
  /** Clases del borde al estar activo como drop target */
  dropActiveClass: string;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "col-1",
    estatus: 1,
    label: "Nueva",
    headerAccent:
      "from-sky-500/15 to-sky-400/5 border-sky-400/25 text-sky-700 dark:text-sky-300",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    dropActiveClass: "ring-2 ring-sky-400/60 bg-sky-50/60 dark:bg-sky-500/10",
  },
  {
    id: "col-2",
    estatus: 2,
    label: "Pendiente",
    headerAccent:
      "from-amber-500/15 to-amber-400/5 border-amber-400/25 text-amber-700 dark:text-amber-300",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    dropActiveClass: "ring-2 ring-amber-400/60 bg-amber-50/60 dark:bg-amber-500/10",
  },
  {
    id: "col-3",
    estatus: 3,
    label: "Autorizada",
    headerAccent:
      "from-emerald-500/15 to-emerald-400/5 border-emerald-400/25 text-emerald-700 dark:text-emerald-300",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    dropActiveClass:
      "ring-2 ring-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-500/10",
  },
  {
    id: "col-4",
    estatus: 4,
    label: "Rechazada",
    headerAccent:
      "from-rose-500/15 to-rose-400/5 border-rose-400/25 text-rose-700 dark:text-rose-300",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    dropActiveClass: "ring-2 ring-rose-400/60 bg-rose-50/60 dark:bg-rose-500/10",
  },
];

// ─── Componente interno: controles de paginación ─────────────────────────────
function ColumnPaginator({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const btnBase = "p-1.5 rounded-lg transition-colors";
  const btnActive =
    "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50";
  const btnDisabled = "text-slate-300 dark:text-slate-600 cursor-not-allowed";

  return (
    <div className="flex items-center justify-between px-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage === 0}
        aria-label="Página anterior"
        className={[btnBase, currentPage === 0 ? btnDisabled : btnActive].join(" ")}
      >
        <ChevronLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums select-none">
        {currentPage + 1} / {totalPages}
      </p>

      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        aria-label="Página siguiente"
        className={[
          btnBase,
          currentPage >= totalPages - 1 ? btnDisabled : btnActive,
        ].join(" ")}
      >
        <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteKanbanColumnProps {
  config: KanbanColumnConfig;
  quotes: Quote[];
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function QuoteKanbanColumn({ config, quotes }: QuoteKanbanColumnProps) {
  const { ref, isDropTarget } = useDroppable({ id: config.id });
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(quotes.length / PAGE_SIZE));

  // El clamp derivado reemplaza al useEffect — sin efectos secundarios ni cascadas de render.
  // Si totalPages se reduce (DnD saca cards o filtro), currentPage se ajusta automáticamente.
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
      {/* Encabezado de columna */}
      <div
        className={[
          "flex items-center justify-between px-4 py-3 rounded-2xl border bg-linear-to-br mb-3",
          "backdrop-blur-sm",
          config.headerAccent,
        ].join(" ")}
      >
        <h2 className="text-sm font-semibold tracking-wide">{config.label}</h2>
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

      {/* Paginación superior */}
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

      {/* Zona de drop */}
      <div
        ref={ref}
        className={[
          "flex-1 rounded-2xl p-2 space-y-2.5 transition-all duration-200 min-h-30",
          "border border-transparent",
          isDropTarget ? config.dropActiveClass : "border-transparent",
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
            <QuoteKanbanCard key={quote.id} quote={quote} />
          ))
        )}
      </div>

      {/* Paginación inferior */}
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

