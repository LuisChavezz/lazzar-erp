"use client";

import { useState, useTransition } from "react";
import { ListIcon, KanbanBoardIcon } from "@/src/components/Icons";
import { QuoteList } from "./QuoteList";
import { QuoteKanbanBoard } from "./QuoteKanbanBoard";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type QuoteView = "list" | "board";

// ─── Opciones del toggle ──────────────────────────────────────────────────────
const VIEW_OPTIONS: { value: QuoteView; label: string; Icon: typeof ListIcon }[] = [
  { value: "list", label: "Listado", Icon: ListIcon },
  { value: "board", label: "Tablero", Icon: KanbanBoardIcon },
];

/**
 * Envuelve el listado y el tablero Kanban de cotizaciones.
 * Gestiona el cambio de vista con CSS (hidden/block) en lugar de desmontaje,
 * para que ambas vistas conserven su estado interno (filtros, posiciones DnD,
 * búsqueda, paginación) sin ningún re-render innecesario al hacer el switch.
 *
 * useTransition marca el cambio de vista como no urgente: si el componente
 * recién revelado tarda en pintar, React no bloquea la UI.
 */
export function QuoteViewSwitcher() {
  const [view, setView] = useState<QuoteView>("list");
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (next: QuoteView) => {
    if (next === view) return;
    startTransition(() => setView(next));
  };

  return (
    <div className="space-y-4">
      {/* Toggle de vista */}
      <div className="flex justify-end">
        <div
          role="tablist"
          aria-label="Cambiar vista de cotizaciones"
          className={[
            "inline-flex items-center gap-0.5 p-1 rounded-xl",
            "bg-slate-100 dark:bg-white/5",
            "border border-slate-200 dark:border-white/10",
            "transition-opacity duration-150",
            isPending ? "opacity-60 pointer-events-none" : "",
          ].join(" ")}
        >
          {VIEW_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = view === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`quote-view-panel-${value}`}
                onClick={() => handleSwitch(value)}
                className={[
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg",
                  "transition-all duration-200 focus:outline-none focus-visible:ring-2  cursor-pointer focus-visible:ring-sky-500",
                  isActive
                    ? "bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/*
       * Ambos paneles permanecen montados para preservar estado interno.
       * Solo se ocultan con CSS — cero desmontajes, cero pérdida de estado.
       */}
      <div
        id="quote-view-panel-list"
        role="tabpanel"
        aria-label="Vista de listado"
        className={view === "list" ? "block" : "hidden"}
      >
        <QuoteList />
      </div>

      <div
        id="quote-view-panel-board"
        role="tabpanel"
        aria-label="Vista de tablero kanban"
        className={view === "board" ? "block" : "hidden"}
      >
        <QuoteKanbanBoard />
      </div>
    </div>
  );
}
