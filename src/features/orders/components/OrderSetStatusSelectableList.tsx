import { Order } from "../interfaces/order.interface";
import { OrderSetStatusSelectableRow } from "./OrderSetStatusSelectableRow";

interface OrderSetStatusSelectableListProps {
  hasOrders: boolean;
  hasResults: boolean;
  orders: Order[];
  selectedIds: Set<string>;
  onToggle: (orderId: string) => void;
}

export function OrderSetStatusSelectableList({
  hasOrders,
  hasResults,
  orders,
  selectedIds,
  onToggle,
}: OrderSetStatusSelectableListProps) {
  if (!hasOrders) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No hay pedidos disponibles
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Sin resultados
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2" role="list">
      {orders.map((order) => (
        <OrderSetStatusSelectableRow
          key={order.id}
          order={order}
          isSelected={selectedIds.has(order.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
