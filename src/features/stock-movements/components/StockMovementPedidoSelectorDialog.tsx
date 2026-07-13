"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
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
 * de modo que `useOrders()` (`/ventas/pedidos/`) se ejecuta bajo demanda.
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

  // Selección tentativa: no se propaga al formulario hasta confirmar.
  const [tentativeId, setTentativeId] = useState<number | null>(selectedPedidoId);
  const isConfirmDisabled = tentativeId === null || isLoading || isError;

  const handleConfirm = () => {
    const order = orders.find((o) => o.id === tentativeId);
    if (!order) return;
    onConfirm({ id: order.id, label: order.folio });
  };

  return (
    <>
      <DialogHeader
        title="Seleccionar Pedido"
        subtitle="Vincula el movimiento a un pedido existente"
        statusColor="indigo"
      />

      {isLoading ? (
        <Loader
          title="Cargando pedidos"
          message="Obteniendo pedidos disponibles..."
        />
      ) : isError ? (
        <p className="text-sm text-red-500 p-4">Error al cargar los pedidos.</p>
      ) : (
        <SearchableSelectList<Order>
          items={orders}
          searchPlaceholder="Buscar pedido por folio o cliente..."
          filterPredicate={(order, term) =>
            order.folio.toLowerCase().includes(term) ||
            order.cliente_nombre.toLowerCase().includes(term)
          }
          getKey={(order) => order.id}
          isSelected={(order) => order.id === tentativeId}
          onSelect={(order) =>
            setTentativeId((prev) => (prev === order.id ? null : order.id))
          }
          emptyMessage="No hay pedidos disponibles."
          noResultsMessage="No se encontraron pedidos"
          renderIndicator={renderRadioIndicator}
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
        />
      )}

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
        >
          Confirmar selección
        </Button>
      </div>
    </>
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
