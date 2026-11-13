"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { ServerSearchPickerDialogContent } from "@/src/components/ServerSearchPickerDialogContent";
import { usePedidoSearchField } from "@/src/features/orders/hooks/usePedidoSearch";

export interface SelectedPedido {
  id: number;
  label: string;
}

interface StockMovementPedidoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pedido actualmente vinculado (para fijarlo arriba y resaltarlo al reabrir). */
  selectedPedido: SelectedPedido | null;
  /** Se invoca al confirmar la selección con el pedido elegido. */
  onSelect: (pedido: SelectedPedido) => void;
}

/**
 * Lo que el selector necesita de un pedido. Sale de un resultado de la
 * búsqueda o, para el ya vinculado, de lo que el formulario guardó de él (sin
 * cliente: el formulario solo conserva el folio).
 */
interface PedidoOption {
  id: number;
  folio: string | null;
  cliente: string | null;
}

const optionLabel = (option: PedidoOption) => option.folio ?? `#${option.id}`;

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto,
 * así que la búsqueda (`GET /ventas/pedidos/?q=&limit=`) corre bajo demanda.
 *
 * La selección es *tentativa*: solo se propaga al formulario al pulsar
 * "Confirmar selección". Se guarda el pedido ENTERO, no su id, para que siga
 * fijo arriba aunque la búsqueda ya no lo traiga.
 */
function PedidoSelectorContent({
  selectedPedido,
  onConfirm,
  onCancel,
}: {
  selectedPedido: SelectedPedido | null;
  onConfirm: (pedido: SelectedPedido) => void;
  onCancel: () => void;
}) {
  const { pedidos, ...search } = usePedidoSearchField();
  const results: PedidoOption[] = pedidos.map((pedido) => ({
    id: pedido.id,
    folio: pedido.folio,
    cliente: pedido.cliente_nombre,
  }));

  return (
    <ServerSearchPickerDialogContent<PedidoOption>
      title="Seleccionar Pedido"
      subtitle="Vincula el movimiento a un pedido existente"
      statusColor="indigo"
      query={{ ...search, results }}
      searchPlaceholder="Buscar pedido por folio, OC o cliente..."
      initialSelected={
        selectedPedido ? { id: selectedPedido.id, folio: selectedPedido.label, cliente: null } : null
      }
      getKey={(option) => option.id}
      renderContent={(option) => (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {optionLabel(option)}
          </p>
          {option.cliente && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{option.cliente}</p>
          )}
        </>
      )}
      emptyMessage="No hay pedidos disponibles."
      noResultsMessage="No se encontraron pedidos"
      errorMessage="Error al buscar los pedidos."
      onConfirm={(option) => onConfirm({ id: option.id, label: optionLabel(option) })}
      onCancel={onCancel}
    />
  );
}

/**
 * StockMovementPedidoSelectorDialog
 *
 * Diálogo de selección única de pedido, apilado ENCIMA del formulario de
 * movimiento (el formulario permanece montado detrás para no perder su estado —
 * ver `StockMovementForm`). Busca en el servidor (`usePedidoSearchField`) en vez
 * de cargar la lista completa de pedidos.
 *
 * La selección es *tentativa*: solo se propaga al formulario al pulsar
 * "Confirmar selección". Cerrar/cancelar no altera nada.
 */
export function StockMovementPedidoSelectorDialog({
  open,
  onOpenChange,
  selectedPedido,
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
          selectedPedido={selectedPedido}
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
