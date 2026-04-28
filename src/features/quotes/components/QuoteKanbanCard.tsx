"use client";

import { useDraggable } from "@dnd-kit/react";
import { Quote } from "../interfaces/quote.interface";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { formatQuoteDateTime } from "../utils/quoteDetailsFormatters";
import { QuoteCardActions } from "./QuoteCardActions";

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteKanbanCardProps {
  quote: Quote;
  /** Cuando se renderiza como overlay de arrastre, el card no registra drag */
  isOverlay?: boolean;
}

// ─── Paleta por estatus ───────────────────────────────────────────────────────
const statusAccent: Record<number, string> = {
  1: "from-sky-500/20 to-sky-400/5 border-sky-400/30",
  2: "from-amber-500/20 to-amber-400/5 border-amber-400/30",
  3: "from-emerald-500/20 to-emerald-400/5 border-emerald-400/30",
  4: "from-rose-500/20 to-rose-400/5 border-rose-400/30",
};

const statusDot: Record<number, string> = {
  1: "bg-sky-400",
  2: "bg-amber-400",
  3: "bg-emerald-400",
  4: "bg-rose-400",
};

// ─── Componente interno: contenido del card ───────────────────────────────────
function CardContent({ quote, isOverlay }: { quote: Quote; isOverlay: boolean }) {
  const accentClass = statusAccent[quote.estatus] ?? statusAccent[1];
  const dotClass = statusDot[quote.estatus] ?? statusDot[1];

  const gran_total = formatCurrency(Number(quote.gran_total) || 0);
  const fecha = formatQuoteDateTime(quote.created_at, "d MMM yyyy");

  return (
    <div
      className={[
        "group relative rounded-2xl border bg-linear-to-br p-4 shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:-translate-y-0.5",
        "dark:bg-slate-800/60 dark:shadow-black/30",
        "bg-white",
        accentClass,
      ].join(" ")}
    >
      {/* Fila superior: id + menú de acciones */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase pt-0.5">
          #{String(quote.id).padStart(5, "0")}
        </p>
        {/* El ActionMenu no activa el drag porque su pointerdown hace stopPropagation implícito en Radix */}
        {!isOverlay && (
          <div
            className="-mr-1.5 -mt-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <QuoteCardActions quote={quote} align="end" />
          </div>
        )}
        {isOverlay && (
          <span
            className={[
              "size-2 rounded-full ring-2 ring-white/60 dark:ring-slate-700 mt-1",
              dotClass,
            ].join(" ")}
            aria-hidden="true"
          />
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
      {quote.cliente_razon_social && quote.cliente_razon_social !== quote.cliente_nombre && (
        <p
          className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3"
          title={quote.cliente_razon_social}
        >
          {quote.cliente_razon_social}
        </p>
      )}

      {/* Divider */}
      <div className="my-2.5 h-px bg-slate-100 dark:bg-slate-700/60" />

      {/* Footer: total + piezas */}
      <div className="flex items-end justify-between gap-2 mt-auto">
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
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        {fecha}
      </p>

      {/* OC si tiene */}
      {quote.oc && (
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 truncate">
          OC: {quote.oc}
        </p>
      )}

      {/* Gradiente de hover sutil */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-br from-white/10 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Card draggable ───────────────────────────────────────────────────────────
export function QuoteKanbanCard({ quote, isOverlay = false }: QuoteKanbanCardProps) {
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
      <CardContent quote={quote} isOverlay={isOverlay} />
    </div>
  );
}
