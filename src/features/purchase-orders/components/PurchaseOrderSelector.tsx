"use client";

import { useState } from "react";
import { Order } from "@/src/features/orders/interfaces/order.interface";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { SearchInput } from "@/src/components/SearchInput";

interface PurchaseOrderSelectorProps {
  selectedOrderId: number | null;
  onSelect: (order: Order) => void;
}

export function PurchaseOrderSelector({
  selectedOrderId,
  onSelect,
}: PurchaseOrderSelectorProps) {
  const { orders, isLoading, isError } = useOrders();
  const [search, setSearch] = useState("");

  // Filtra por folio, folio_consecutivo o cliente
  const filtered = orders.filter((order) => {
    const term = search.toLowerCase();
    return (
      order.folio.toLowerCase().includes(term) ||
      String(order.folio_consecutivo).includes(term) ||
      order.cliente_nombre.toLowerCase().includes(term) ||
      order.cliente_razon_social.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-slate-500 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600" />
        <span>Cargando pedidos...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">
        Error al cargar los pedidos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Buscador */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por folio, número o cliente..."
      />

      {/* Lista con scroll */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No se encontraron pedidos
          </p>
        ) : (
          filtered.map((order) => {
            const isSelected = selectedOrderId === order.id;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => onSelect(order)}
                className={`w-full flex items-start justify-between gap-4 px-4 py-3 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-sky-50 dark:bg-sky-500/10"
                    : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {order.folio}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {order.cliente_nombre || order.cliente_razon_social}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white tabular-nums">
                    {Number(order.gran_total).toLocaleString("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    })}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                      Seleccionado
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
