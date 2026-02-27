import { CheckCircleIcon } from "@/src/components/Icons";
import { Order } from "../interfaces/order.interface";
import { getStatusStyles } from "../utils/getStatusStyle";
import { formatCurrency } from "@/src/utils/formatCurrency";

interface OrderSetStatusSelectableRowProps {
  order: Order;
  isSelected: boolean;
  onToggle: (orderId: string) => void;
}

export function OrderSetStatusSelectableRow({
  order,
  isSelected,
  onToggle,
}: OrderSetStatusSelectableRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(order.id)}
      className={`w-full text-left p-3 rounded-2xl border flex gap-3 items-start cursor-pointer transition-colors ${
        isSelected
          ? "border-sky-200 dark:border-sky-700 bg-sky-50/70 dark:bg-sky-500/10 hover:bg-sky-50 dark:hover:bg-sky-500/20"
          : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800"
      }`}
      role="listitem"
      aria-label={`Seleccionar ${order.folio}`}
    >
      <div className="pt-0.5">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
            isSelected
              ? "border-sky-300 dark:border-sky-600 bg-sky-100 dark:bg-sky-500/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900"
          }`}
          aria-hidden="true"
        >
          {isSelected && <CheckCircleIcon className="w-4 h-4 text-sky-600" />}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
              {order.folio}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {order.clienteNombre}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusStyles(
              order.estatusPedido
            )}`}
          >
            {order.estatusPedido}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>{order.fecha}</span>
          <span>{formatCurrency(order.totals.granTotal)}</span>
        </div>
      </div>
    </button>
  );
}
