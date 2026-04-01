import { Quote } from "../interfaces/quote.interface";
import { QuoteSetStatusSelectableRow } from "./QuoteSetStatusSelectableRow";

interface QuoteSetStatusSelectableListProps {
  hasOrders: boolean;
  hasResults: boolean;
  quotes: Quote[];
  selectedIds: Set<number>;
  onToggle: (quoteId: number) => void;
}

export function QuoteSetStatusSelectableList({
  hasOrders,
  hasResults,
  quotes,
  selectedIds,
  onToggle,
}: QuoteSetStatusSelectableListProps) {
  if (!hasOrders) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No hay pedidos disponibles para actualizar Activo/Inactivo
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Sin resultados para el filtro actual
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2" role="list">
      {quotes.map((quote) => (
        <QuoteSetStatusSelectableRow
          key={quote.id}
          quote={quote}
          isSelected={selectedIds.has(quote.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
