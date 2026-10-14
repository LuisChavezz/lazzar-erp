"use client";

import { useId } from "react";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { CheckIcon } from "@/src/components/Icons";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import type { PedidoVinculado } from "../interfaces/purchase-order.interface";

/**
 * Estatus de pedido que se ofrecen para ligar: todos menos CANCELADO. Se piden
 * al backend (`?estatus=1,2,3,4`, que solo aplica en el listado) en vez de
 * filtrar aquí, para no bajar los cancelados. Los inactivos (borrados) ya no
 * los devuelve `GET /ventas/pedidos/`; el filtro de cliente de abajo es solo
 * una red por si eso cambia.
 */
const LINKABLE_PEDIDO_ESTATUS = Object.values(PEDIDO_ESTATUS)
  .filter((estatus) => estatus !== PEDIDO_ESTATUS.CANCELADO)
  .join(",");

const LINKABLE_PEDIDOS_PARAMS = { estatus: LINKABLE_PEDIDO_ESTATUS };

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

interface PedidoOption {
  id: number;
  folio: string | null;
  cliente: string | null;
  /**
   * Ya ligado a la orden pero fuera del catálogo que se ofrece (cancelado,
   * inactivo o no visible): se conserva marcado y se avisa, nunca se suelta en
   * silencio.
   */
  unavailable: boolean;
}

const pedidoLabel = (option: Pick<PedidoOption, "id" | "folio">) =>
  option.folio?.trim() || `Pedido #${option.id}`;

const renderCheckboxIndicator = (selected: boolean) => (
  <span
    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
      selected
        ? "border-sky-500 bg-sky-500 text-white"
        : "border-slate-300 dark:border-slate-600"
    }`}
  >
    {selected && <CheckIcon className="w-3.5 h-3.5" />}
  </span>
);

interface PurchaseOrderPedidosFieldProps {
  /** Ids seleccionados (el valor del formulario). */
  value: number[];
  onChange: (ids: number[]) => void;
  /**
   * Pedidos ya ligados a la orden (`pedidos_vinculados`): dan la etiqueta de
   * un seleccionado que no está entre las opciones. `[]` en el alta.
   */
  linkedPedidos?: PedidoVinculado[];
  error?: FormFieldError;
}

/**
 * Selector MÚLTIPLE de pedidos de venta para el encabezado de la orden de
 * compra (alta y edición). Lista buscable en línea, con casillas.
 *
 * - Los seleccionados van FIJOS arriba y la búsqueda nunca los oculta (mismo
 *   patrón que `OpportunityTransferDialog`, issue #262): lo que se guarda
 *   siempre está a la vista.
 * - No hay pedido "principal" ni orden significativo: los seleccionados se
 *   muestran en el orden en que están en el valor.
 * - Un ligado que ya no se ofrece (cancelado/inactivo) sigue marcado, con su
 *   folio de `linkedPedidos` y un aviso; desmarcarlo es decisión del usuario.
 *
 * No usa `MultiSelectPickerDialogContent`: aquel arranca su selección vacía y
 * solo AÑADE, y su selección tentativa es interna, así que no puede mostrar lo
 * ya ligado ni fijarlo arriba.
 */
export function PurchaseOrderPedidosField({
  value,
  onChange,
  linkedPedidos = [],
  error,
}: PurchaseOrderPedidosFieldProps) {
  const { orders, isLoading, isError, hasLoaded } = useOrders(LINKABLE_PEDIDOS_PARAMS);
  const labelId = useId();
  const errorId = useId();

  const selectedIds = new Set(value);

  const options: PedidoOption[] = orders
    .filter((order) => order.activo !== false && order.estatus !== PEDIDO_ESTATUS.CANCELADO)
    .map((order) => ({
      id: order.id,
      folio: order.folio,
      cliente: order.cliente_nombre ?? order.cliente_razon_social,
      unavailable: false,
    }));
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const linkedById = new Map(linkedPedidos.map((pedido) => [pedido.id, pedido]));

  // Seleccionados primero (en el orden del valor), luego el resto.
  const selectedOptions: PedidoOption[] = value.map(
    (id) =>
      optionsById.get(id) ?? {
        id,
        folio: linkedById.get(id)?.folio ?? null,
        cliente: null,
        // Mientras el catálogo carga no se sabe si está disponible: no se avisa.
        unavailable: hasLoaded,
      },
  );
  const listedOptions = [
    ...selectedOptions,
    ...options.filter((option) => !selectedIds.has(option.id)),
  ];

  const toggle = (option: PedidoOption) => {
    onChange(
      selectedIds.has(option.id)
        ? value.filter((id) => id !== option.id)
        : [...value, option.id],
    );
  };

  const count = value.length;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className="w-full space-y-2"
      // Enter en el buscador NO envía el formulario del paso: se escribe ahí
      // para filtrar.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <div className="flex items-baseline justify-between gap-3 ml-1">
        <span
          id={labelId}
          className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
        >
          Pedidos
        </span>
        <span className={`text-xs ${MUTED_CLS}`}>
          {count === 0
            ? "Ninguno seleccionado"
            : `${count} ${count === 1 ? "seleccionado" : "seleccionados"}`}
        </span>
      </div>

      {isInitialLoadError(isError, hasLoaded) ? (
        <>
          <p role="alert" className="text-sm text-red-500 py-2">
            No se pudieron cargar los pedidos.
          </p>
          {/* Sin catálogo, lo ya seleccionado sigue a la vista. */}
          {count > 0 && (
            <ul className={`text-xs ${MUTED_CLS} space-y-0.5`}>
              {selectedOptions.map((option) => (
                <li key={option.id}>{pedidoLabel(option)}</li>
              ))}
            </ul>
          )}
        </>
      ) : isLoading ? (
        <p role="status" className={`py-6 text-center text-sm ${MUTED_CLS}`}>
          Cargando pedidos...
        </p>
      ) : (
        <SearchableSelectList<PedidoOption>
          items={listedOptions}
          searchPlaceholder="Buscar pedido por folio o cliente..."
          filterPredicate={(option, term) =>
            selectedIds.has(option.id) ||
            pedidoLabel(option).toLowerCase().includes(term) ||
            (option.cliente ?? "").toLowerCase().includes(term)
          }
          getKey={(option) => option.id}
          isSelected={(option) => selectedIds.has(option.id)}
          onSelect={toggle}
          renderIndicator={renderCheckboxIndicator}
          renderContent={(option) => (
            <>
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                {pedidoLabel(option)}
              </span>
              {option.unavailable ? (
                <span className="block truncate text-xs text-amber-600 dark:text-amber-400">
                  Ya no está disponible (cancelado o inactivo). Desmárcalo para desligarlo.
                </span>
              ) : (
                option.cliente && (
                  <span className={`block truncate text-xs ${MUTED_CLS}`}>{option.cliente}</span>
                )
              )}
            </>
          )}
          emptyMessage="No hay pedidos disponibles para ligar."
          noResultsMessage="Ningún pedido coincide con la búsqueda."
        />
      )}

      {error?.message && (
        <p id={errorId} role="alert" className="ml-1 text-xs text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
    </div>
  );
}
