"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/src/components/Icons";

// ─── Props ────────────────────────────────────────────────────────────────────
interface ColumnPaginatorProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

// ─── Componente de paginación para columnas kanban ────────────────────────────
export function ColumnPaginator({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: ColumnPaginatorProps) {
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
