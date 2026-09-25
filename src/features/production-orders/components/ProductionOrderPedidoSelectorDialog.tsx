"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { useSpecialOrders } from "@/src/features/special-orders/hooks/useSpecialOrders";
import type { SpecialOrderRow } from "@/src/features/special-orders/utils/specialOrderFilters";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";

/** Pedido elegido en el selector: id para el body y etiqueta para la tarjeta. */
export interface SelectedProductionOrderPedido {
  id: number;
  label: string;
}

interface ProductionOrderPedidoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pedido actualmente vinculado (para resaltarlo al reabrir). */
  selectedPedidoId: number | null;
  /** Se invoca al confirmar la selección con el pedido elegido. */
  onSelect: (pedido: SelectedProductionOrderPedido) => void;
}

/** Etiqueta del pedido: su folio, o `#<id>` si el folio no está asignado. */
function pedidoLabel(order: SpecialOrderRow): string {
  return order.folio ?? `#${order.id}`;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto, de
 * modo que `useSpecialOrders()` (`/produccion/pedidos-especiales/`) se ejecuta
 * bajo demanda. Mismo esqueleto que `StockMovementPedidoSelectorDialog`.
 *
 * No se filtra nada en cliente: el endpoint ya lista solo pedidos que pasan la
 * validación del alta (línea de muestra, `clasificacion`, `fecha_confirmacion`)
 * y no expone `estatus`. Cualquier otro rechazo llega como `400 { pedido }`.
 */
function PedidoSelectorContent({
  selectedPedidoId,
  onConfirm,
  onCancel,
}: {
  selectedPedidoId: number | null;
  onConfirm: (pedido: SelectedProductionOrderPedido) => void;
  onCancel: () => void;
}) {
  const { orders, isLoading, isError, hasLoaded } = useSpecialOrders();

  return (
    <SingleSelectPickerDialogContent<SpecialOrderRow>
      title="Seleccionar Pedido"
      subtitle="Vincula la orden de producción a un pedido especial"
      statusColor="indigo"
      items={orders}
      isLoading={isLoading}
      // Solo un error SIN datos cargados oculta la lista; un refetch fallido
      // la conserva y avisa por toast (ver `useSpecialOrders`).
      isError={isInitialLoadError(isError, hasLoaded)}
      loadingTitle="Cargando pedidos"
      loadingMessage="Obteniendo pedidos especiales disponibles..."
      errorMessage="Error al cargar los pedidos especiales."
      searchPlaceholder="Buscar pedido por folio o cliente..."
      filterPredicate={(order, term) =>
        (order.folio ?? "").toLowerCase().includes(term) ||
        (order.cliente_nombre ?? "").toLowerCase().includes(term)
      }
      getKey={(order) => order.id}
      selectedKey={selectedPedidoId}
      emptyMessage="No hay pedidos especiales disponibles."
      noResultsMessage="No se encontraron pedidos"
      renderContent={(order) => (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {pedidoLabel(order)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {order.cliente_nombre ?? "—"}
          </p>
        </>
      )}
      onConfirm={(order) => onConfirm({ id: order.id, label: pedidoLabel(order) })}
      onCancel={onCancel}
    />
  );
}

/**
 * ProductionOrderPedidoSelectorDialog
 *
 * Diálogo de selección única de pedido especial, apilado ENCIMA del asistente
 * de creación (`CreateProductionOrderDialog`), que permanece montado detrás
 * para no perder su estado. La selección es tentativa: solo se propaga al
 * pulsar "Confirmar selección"; cerrar/cancelar no altera nada.
 */
export function ProductionOrderPedidoSelectorDialog({
  open,
  onOpenChange,
  selectedPedidoId,
  onSelect,
}: ProductionOrderPedidoSelectorDialogProps) {
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
