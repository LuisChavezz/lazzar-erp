"use client";

import { useId } from "react";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";
import { usePedidoSearchField } from "@/src/features/orders/hooks/usePedidoSearch";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { PedidoVinculado } from "../interfaces/purchase-order.interface";
import { LINKABLE_PEDIDO_ESTATUS } from "../constants/linkablePedidos";
import type {
  PedidoSeleccionado,
  PedidoSelectionMemory,
} from "../hooks/usePedidoSelectionMemory";

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

type PedidoOption = PedidoSeleccionado;

const toOption = (pedido: PedidoListItem): PedidoOption => ({
  id: pedido.id,
  folio: pedido.folio,
  cliente: pedido.cliente_nombre ?? pedido.cliente_razon_social,
});

const pedidoLabel = (option: Pick<PedidoOption, "id" | "folio">) =>
  option.folio?.trim() || `Pedido #${option.id}`;

interface PurchaseOrderPedidosFieldProps {
  /** Ids seleccionados (el valor del formulario). */
  value: number[];
  onChange: (ids: number[]) => void;
  /**
   * Pedidos ya ligados a la orden (`pedidos_vinculados`): dan la etiqueta de
   * un seleccionado que la búsqueda no trae. `[]` en el alta.
   */
  linkedPedidos?: PedidoVinculado[];
  /**
   * Folio y cliente de lo que el usuario marcó, guardados al marcar por el
   * step manager (`usePedidoSelectionMemory`): sobreviven a que este campo se
   * desmonte al cambiar de paso.
   */
  selection: PedidoSelectionMemory;
  error?: FormFieldError;
}

const NO_LINKED_PEDIDOS: PedidoVinculado[] = [];

/**
 * Selector MÚLTIPLE de pedidos de venta para el encabezado de la orden de
 * compra (alta y edición). Busca en el servidor (`?q=` + `?limit=`, solo los
 * pedidos que se pueden ligar) en vez de cargar la lista completa.
 *
 * - Los seleccionados van FIJOS arriba y la búsqueda nunca los oculta (issue
 *   #262): lo que se guarda siempre está a la vista. Se pintan con lo que se
 *   sabe de ellos: el resultado en que se marcaron (`selection`, que guarda
 *   el step manager) o, para los ya ligados, su folio de `pedidos_vinculados`.
 * - No hay pedido "principal" ni orden significativo: los seleccionados se
 *   muestran en el orden en que están en el valor.
 */
export function PurchaseOrderPedidosField({
  value,
  onChange,
  linkedPedidos = NO_LINKED_PEDIDOS,
  selection,
  error,
}: PurchaseOrderPedidosFieldProps) {
  const labelId = useId();
  const errorId = useId();
  const { search, setSearch, isSearching, pedidos, total, hasResults, isInitialError, refetch } =
    usePedidoSearchField({ estatus: LINKABLE_PEDIDO_ESTATUS });
  const linkedById = new Map(linkedPedidos.map((pedido) => [pedido.id, pedido]));

  const selectedIds = new Set(value);
  const pinned = value.map(
    (id): PedidoOption =>
      selection.known.get(id) ?? {
        id,
        folio: linkedById.get(id)?.folio ?? null,
        cliente: null,
      },
  );

  const toggle = (option: PedidoOption) => {
    if (selectedIds.has(option.id)) {
      onChange(value.filter((id) => id !== option.id));
      return;
    }
    selection.remember(option);
    onChange([...value, option.id]);
  };

  const count = value.length;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className="w-full space-y-2"
    >
      <div className="flex items-baseline justify-between gap-3 ml-1">
        <span
          id={labelId}
          className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
        >
          Pedidos{" "}
          <span className="normal-case font-medium tracking-normal">(opcional)</span>
        </span>
        <span className={`text-xs ${MUTED_CLS}`}>
          {count === 0
            ? "Ninguno seleccionado"
            : `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`}
        </span>
      </div>

      <ServerSearchSelectList<PedidoOption>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pedido por folio, OC o cliente..."
        results={pedidos.map(toOption)}
        pinned={pinned}
        getKey={(option) => option.id}
        isSelected={(option) => selectedIds.has(option.id)}
        onSelect={toggle}
        renderIndicator={renderCheckboxIndicator}
        renderContent={(option) => (
          <>
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
              {pedidoLabel(option)}
            </span>
            {option.cliente && (
              <span className={`block truncate text-xs ${MUTED_CLS}`}>{option.cliente}</span>
            )}
          </>
        )}
        hasResults={hasResults}
        isInitialError={isInitialError}
        isSearching={isSearching}
        onRetry={() => void refetch()}
        total={total}
        emptyMessage="No hay pedidos disponibles para ligar."
        noResultsMessage="Ningún pedido coincide con la búsqueda."
        errorMessage="No se pudieron buscar los pedidos."
        maxHeightClassName="max-h-64"
      />

      {error?.message && (
        <p id={errorId} role="alert" className="ml-1 text-xs text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
    </div>
  );
}
