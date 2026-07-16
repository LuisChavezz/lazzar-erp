"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import type { Order } from "@/src/features/orders/interfaces/order.interface";

export interface SelectedPedido {
  id: number;
  label: string;
}

interface StockMovementPedidoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pedido actualmente vinculado (para resaltarlo al reabrir). */
  selectedPedidoId: number | null;
  /** Se invoca al confirmar la selección con el pedido elegido. */
  onSelect: (pedido: SelectedPedido) => void;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto,
 * de modo que `useOrders()` (`/ventas/pedidos/`) se ejecuta bajo demanda. Este
 * componente (con nombre propio, no una arrow function anónima) es lo que
 * permite llamar el hook aquí y no en `SingleSelectPickerDialogContent`, que
 * es puramente presentacional y no sabe de dónde vienen los `items`.
 */
function PedidoSelectorContent({
  selectedPedidoId,
  onConfirm,
  onCancel,
}: {
  selectedPedidoId: number | null;
  onConfirm: (pedido: SelectedPedido) => void;
  onCancel: () => void;
}) {
  const { orders, isLoading, isError } = useOrders();

  return (
    <SingleSelectPickerDialogContent<Order>
      title="Seleccionar Pedido"
      subtitle="Vincula el movimiento a un pedido existente"
      statusColor="indigo"
      items={orders}
      isLoading={isLoading}
      isError={isError}
      loadingTitle="Cargando pedidos"
      loadingMessage="Obteniendo pedidos disponibles..."
      errorMessage="Error al cargar los pedidos."
      searchPlaceholder="Buscar pedido por folio o cliente..."
      filterPredicate={(order, term) =>
        order.folio.toLowerCase().includes(term) ||
        order.cliente_nombre.toLowerCase().includes(term)
      }
      getKey={(order) => order.id}
      selectedKey={selectedPedidoId}
      emptyMessage="No hay pedidos disponibles."
      noResultsMessage="No se encontraron pedidos"
      renderContent={(order) => (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {order.folio}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {order.cliente_nombre}
          </p>
        </>
      )}
      onConfirm={(order) => onConfirm({ id: order.id, label: order.folio })}
      onCancel={onCancel}
    />
  );
}

/**
 * StockMovementPedidoSelectorDialog
 *
 * Diálogo de selección única de pedido, apilado ENCIMA del formulario de
 * movimiento (el formulario permanece montado detrás para no perder su estado —
 * ver `StockMovementForm`). Reutiliza el patrón de lista buscable
 * (`SearchableSelectList` + `useOrders`) de `InvoiceOrderSelector`.
 *
 * A diferencia de `InvoiceOrderSelector`, la selección es *tentativa*: solo se
 * propaga al formulario al pulsar "Confirmar selección". Cerrar/cancelar no
 * altera nada.
 */
export function StockMovementPedidoSelectorDialog({
  open,
  onOpenChange,
  selectedPedidoId,
  onSelect,
}: StockMovementPedidoSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="520px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. */}
      {open && (
        <PedidoSelectorContent
          selectedPedidoId={selectedPedidoId}
          onConfirm={(pedido) => {
            onSelect(pedido);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
