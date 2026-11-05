"use client";

import { useId, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";
import { ORDERS_QUERY_KEY } from "@/src/features/orders/hooks/useOrders";
import { usePedidoSearchField } from "@/src/features/orders/hooks/usePedidoSearch";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { PedidoVinculado } from "../interfaces/purchase-order.interface";
import { LINKABLE_PEDIDO_ESTATUS } from "../constants/linkablePedidos";

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

interface PedidoOption {
  id: number;
  folio: string | null;
  cliente: string | null;
}

const toOption = (pedido: PedidoListItem): PedidoOption => ({
  id: pedido.id,
  folio: pedido.folio,
  cliente: pedido.cliente_nombre ?? pedido.cliente_razon_social,
});

const pedidoLabel = (option: Pick<PedidoOption, "id" | "folio">) =>
  option.folio?.trim() || `Pedido #${option.id}`;

/**
 * Lo que ya se sabe de cada pedido al montar el campo: los ligados a la orden
 * (`pedidos_vinculados`, solo folio) y lo que trajeron las búsquedas que
 * siguen en caché. Con esto un pedido marcado antes de cambiar de paso
 * conserva su folio y cliente al volver, aunque la búsqueda ya no lo traiga.
 */
const seedKnownPedidos = (
  queryClient: QueryClient,
  linkedPedidos: PedidoVinculado[],
): Map<number, PedidoOption> => {
  const known = new Map<number, PedidoOption>(
    linkedPedidos.map((pedido) => [pedido.id, { ...pedido, cliente: null }]),
  );
  const cached = queryClient.getQueriesData<PaginatedListResponse<PedidoListItem>>({
    queryKey: [...ORDERS_QUERY_KEY, "search"],
  });
  for (const [, page] of cached) {
    for (const pedido of page?.results ?? []) known.set(pedido.id, toOption(pedido));
  }
  return known;
};

interface PurchaseOrderPedidosFieldProps {
  /** Ids seleccionados (el valor del formulario). */
  value: number[];
  onChange: (ids: number[]) => void;
  /**
   * Pedidos ya ligados a la orden (`pedidos_vinculados`): dan la etiqueta de
   * un seleccionado que la búsqueda no trae. `[]` en el alta.
   */
  linkedPedidos?: PedidoVinculado[];
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
 *   sabe de ellos (`known`): el resultado en que se marcaron o, para los ya
 *   ligados, su folio de `pedidos_vinculados`. Que la página de resultados no
 *   los traiga no dice nada de ellos, así que no se marcan como "no
 *   disponibles".
 * - No hay pedido "principal" ni orden significativo: los seleccionados se
 *   muestran en el orden en que están en el valor.
 */
export function PurchaseOrderPedidosField({
  value,
  onChange,
  linkedPedidos = NO_LINKED_PEDIDOS,
  error,
}: PurchaseOrderPedidosFieldProps) {
  const queryClient = useQueryClient();
  const labelId = useId();
  const errorId = useId();
  const { search, setSearch, isSearching, pedidos, total, hasResults, isInitialError, refetch } =
    usePedidoSearchField({ estatus: LINKABLE_PEDIDO_ESTATUS });
  // Folio y cliente de cada pedido que el usuario marcó (o que ya venía
  // ligado). Se completa al marcar, no al renderizar.
  const [known, setKnown] = useState(() => seedKnownPedidos(queryClient, linkedPedidos));

  const selectedIds = new Set(value);
  const pinned = value.map(
    (id) => known.get(id) ?? { id, folio: null, cliente: null },
  );

  const toggle = (option: PedidoOption) => {
    if (selectedIds.has(option.id)) {
      onChange(value.filter((id) => id !== option.id));
      return;
    }
    setKnown((prev) => new Map(prev).set(option.id, option));
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
