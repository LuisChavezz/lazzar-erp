"use client";

import { useDraggable } from "@dnd-kit/react";
import { Quote } from "../interfaces/quote.interface";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { formatQuoteDateTime } from "../utils/quoteDetailsFormatters";
import { QuoteCardActions } from "./QuoteCardActions";
import { KANBAN_COLUMNS, KanbanColumnConfig } from "../constants/kanbanColumns";

// ─── Lookup estatus → configuración de columna ───────────────────────────────
const CONFIG_BY_ESTATUS = Object.fromEntries(
  KANBAN_COLUMNS.map((c) => [c.estatus, c])
) as Record<number, KanbanColumnConfig>;

// Fallback para estatus desconocido
const DEFAULT_CONFIG = KANBAN_COLUMNS[0];

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteKanbanCardProps {
  quote: Quote;
  /** Cuando se renderiza como overlay de arrastre, el card no registra drag */
  isOverlay?: boolean;  /** Mutación de estatus en curso para este card */
  isPending?: boolean;}

// ─── Contenido del card ───────────────────────────────────────────────────────
function CardContent({
  quote,
  isOverlay,
  isPending,
}: {
  quote: Quote;
  isOverlay: boolean;
  isPending: boolean;
}) {
  const cfg = CONFIG_BY_ESTATUS[quote.estatus] ?? DEFAULT_CONFIG;

  const gran_total = formatCurrency(Number(quote.gran_total) || 0);
  const fecha = formatQuoteDateTime(quote.created_at, "d MMM yyyy");

  return (
    <div
      className={[
        "group relative rounded-2xl border overflow-hidden bg-white dark:bg-slate-900",
        "border-slate-200 dark:border-white/10",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:shadow-xl hover:-translate-y-0.5",
        cfg.cardShadowHover,
        "p-4",
      ].join(" ")}
    >
      {/* Overlay de carga — frosted glass + spinner cuando la mutación está en curso */}
      {isPending && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl overflow-hidden"
          aria-label="Guardando cambio de estatus"
          aria-live="polite"
        >
          {/* Fondo difuminado */}
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[3px]" />
          {/* Spinner + texto */}
          <div className="relative flex flex-col items-center gap-1.5">
            <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-violet-500 dark:border-t-violet-400 animate-spin" />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Guardando…
            </span>
          </div>
        </div>
      )}
      {/* Franja de color izquierda — elemento real, independiente de la cascada de bordes */}
      <span
        className={["absolute left-0 top-0 bottom-0 w-0.75", cfg.accentDot].join(" ")}
        aria-hidden="true"
      />

      {/* Fila superior: id + menú de acciones */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase pt-0.5">
          #{String(quote.id).padStart(5, "0")}
        </p>

        {/* Menú de acciones — stopPropagation evita conflicto con DnD */}
        {!isOverlay && (
          <div className="-mr-1.5 -mt-1" onPointerDown={(e) => e.stopPropagation()}>
            <QuoteCardActions quote={quote} align="end" />
          </div>
        )}
      </div>

      {/* Cliente */}
      <h3
        className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug mb-0.5 line-clamp-2"
        title={quote.cliente_nombre}
      >
        {quote.cliente_nombre}
      </h3>

      {/* Razón social */}
      {quote.cliente_razon_social &&
        quote.cliente_razon_social !== quote.cliente_nombre && (
          <p
            className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2"
            title={quote.cliente_razon_social}
          >
            {quote.cliente_razon_social}
          </p>
        )}

      {/* Divider */}
      <div className="my-2.5 h-px bg-slate-100 dark:bg-slate-700/40" />

      {/* Footer: total + piezas */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mb-0.5">
            Total
          </p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {gran_total}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mb-0.5">
            Piezas
          </p>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {quote.piezas ?? "—"}
          </p>
        </div>
      </div>

      {/* Fecha */}
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">{fecha}</p>

      {/* OC si tiene */}
      {quote.oc && (
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate">
          OC: {quote.oc}
        </p>
      )}
    </div>
  );
}

// ─── Card draggable ───────────────────────────────────────────────────────────
export function QuoteKanbanCard({ quote, isOverlay = false, isPending = false }: QuoteKanbanCardProps) {
  const { ref, isDragging } = useDraggable({
    id: String(quote.id),
    data: { quote },
    disabled: isOverlay,
  });

  return (
    <div
      ref={ref}
      aria-label={`Cotización #${quote.id} — ${quote.cliente_nombre}`}
      style={{
        opacity: isDragging ? 0.35 : 1,
        cursor: isOverlay ? "grabbing" : "grab",
        transform: isDragging ? "scale(0.96)" : undefined,
        transition: isDragging ? "none" : "opacity 150ms ease, transform 150ms ease",
      }}
    >
      <CardContent quote={quote} isOverlay={isOverlay} isPending={isPending} />
    </div>
  );
}
