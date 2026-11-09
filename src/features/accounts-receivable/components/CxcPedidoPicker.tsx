"use client";

import { PedidoServerSelectList } from "@/src/features/orders/components/PedidoServerSelectList";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";

interface CxcPedidoPickerProps {
  /** Id del cliente elegido (0 = ninguno). */
  cliente: number;
  /** Id de la moneda elegida (0 = ninguna). */
  moneda: number;
  /** Pedido elegido: va fijo arriba aunque la búsqueda no lo traiga (issue #262). */
  selected: PedidoListItem | null;
  onSelect: (order: PedidoListItem) => void;
  /** Quita el pedido (es opcional). */
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Pedido (opcional) de una factura pendiente por cobrar. Busca EN EL SERVIDOR
 * (`?q=` por folio, OC o cliente) solo entre los pedidos del cliente y la
 * moneda elegidos (`?cliente=&moneda=`), en vez de descargar la lista completa
 * de pedidos y filtrarla en memoria. El listado ya excluye los pedidos dados
 * de baja o cancelados (`activo=False`).
 */
export function CxcPedidoPicker({
  cliente,
  moneda,
  selected,
  onSelect,
  onClear,
  disabled = false,
}: CxcPedidoPickerProps) {
  const ready = cliente > 0 && moneda > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          Pedido (opcional)
        </span>
        {selected && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400 disabled:opacity-50"
          >
            Quitar pedido
          </button>
        )}
      </div>
      {ready ? (
        <PedidoServerSelectList
          filters={{ cliente, moneda }}
          selected={selected}
          onSelect={(order) => {
            if (!disabled) onSelect(order);
          }}
          searchPlaceholder="Buscar pedido por folio u OC..."
          emptyMessage="Sin pedidos para este cliente y moneda."
          showAmount
          maxHeightClassName="max-h-48"
        />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Selecciona cliente y moneda primero.
        </p>
      )}
    </div>
  );
}
