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
 *
 * Estrategia de montaje diferido (lazy mount):
 * - La vista de listado se monta inmediatamente (vista inicial).
 * - El tablero Kanban se monta solo cuando el usuario lo activa por primera vez.
 * - Una vez montado, ambos paneles permanecen en el DOM ocultos con CSS para
 *   preservar su estado interno (filtros, posiciones DnD, búsqueda, paginación).
 *
 * Esto elimina el costo de inicialización del tablero (DnD setup, cómputo de
 * filtros, suscripción adicional a useQuotes) del render inicial de la página.
 *
 * useTransition marca el cambio de vista como no urgente para no bloquear la UI.
 */
export function QuoteViewSwitcher() {
  const [view, setView] = useState<QuoteView>("list");
  const [isPending, startTransition] = useTransition();

  /**
   * Bandera de montaje diferido del tablero Kanban.
   * Se activa la primera vez que el usuario selecciona la vista de tablero.
   * A partir de ese momento el panel queda montado en el DOM y solo se oculta
   * con CSS, preservando su estado interno (DnD, filtros, búsqueda).
   *
   * Usar estado (no ref) para que React pueda incluir el tablero en el mismo
   * commit de render cuando el usuario cambia de vista por primera vez.
   */
  const [hasBoardMounted, setHasBoardMounted] = useState(false);

  const handleSwitch = (next: QuoteView) => {
    if (next === view) return;
    // Marcar el tablero como montado antes de la transición
    if (next === "board") setHasBoardMounted(true);
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
       * Cada panel se renderiza solo si su vista ya fue activada al menos una vez.
       * Una vez montado se oculta con CSS — cero desmontajes, cero pérdida de estado.
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
        {hasBoardMounted && <QuoteKanbanBoard />}
      </div>
    </div>
  );
}
