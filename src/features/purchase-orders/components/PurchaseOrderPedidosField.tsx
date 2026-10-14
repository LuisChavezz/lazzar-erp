"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchInput } from "@/src/components/SearchInput";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import type { PedidoVinculado } from "../interfaces/purchase-order.interface";

/**
 * Pedidos que se ofrecen para ligar: todos menos los CANCELADOS. Se EXCLUYE el
 * cancelado en vez de pedir una lista de estatus permitidos (`?estatus=`, el
 * único filtro de estatus del endpoint, que solo incluye): así un estatus
 * nuevo del backend aparece en vez de ocultarse en silencio. Los inactivos
 * (borrados) ya no los devuelve `GET /ventas/pedidos/`; filtrar `activo` aquí
 * es solo una red por si eso cambia.
 */
const isLinkablePedido = (order: { activo: boolean; estatus: number }) =>
  order.activo !== false && order.estatus !== PEDIDO_ESTATUS.CANCELADO;

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

interface PedidoOption {
  id: number;
  folio: string | null;
  cliente: string | null;
  /** Folio y cliente en minúsculas, para el buscador. */
  haystack: string;
  /**
   * Ya ligado a la orden pero fuera del catálogo que se ofrece (cancelado,
   * inactivo o no visible): se conserva marcado y se avisa, nunca se suelta en
   * silencio.
   */
  unavailable: boolean;
}

const pedidoLabel = (option: Pick<PedidoOption, "id" | "folio">) =>
  option.folio?.trim() || `Pedido #${option.id}`;

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

const NO_LINKED_PEDIDOS: PedidoVinculado[] = [];

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
 * ya ligado ni fijarlo arriba. Tampoco `SearchableSelectList`, que monta todos
 * los renglones: aquí la lista va virtualizada, con su mismo aspecto.
 */
export function PurchaseOrderPedidosField({
  value,
  onChange,
  linkedPedidos = NO_LINKED_PEDIDOS,
  error,
}: PurchaseOrderPedidosFieldProps) {
  // Opt-out del React Compiler: `useVirtualizer` retorna funciones internas
  // que el compilador no puede memoizar de forma segura (mismo criterio que el
  // paso de productos del wizard). Por eso la memoización de abajo es manual.
  "use no memo";

  const { orders, isLoading, isError, hasLoaded } = useOrders();
  const labelId = useId();
  const errorId = useId();
  const [search, setSearch] = useState("");

  // Catálogo derivado UNA vez por respuesta del listado, no en cada render
  // (cada tecla en cualquier campo del paso re-renderiza este componente).
  const { options, optionsById } = useMemo(() => {
    const opts: PedidoOption[] = orders.filter(isLinkablePedido).map((order) => {
      const cliente = order.cliente_nombre ?? order.cliente_razon_social;
      return {
        id: order.id,
        folio: order.folio,
        cliente,
        haystack: `${order.folio ?? ""}\n${cliente ?? ""}`.toLowerCase(),
        unavailable: false,
      };
    });
    return { options: opts, optionsById: new Map(opts.map((option) => [option.id, option])) };
  }, [orders]);

  const selectedIds = useMemo(() => new Set(value), [value]);

  // Seleccionados primero (en el orden del valor), luego el resto. Los
  // seleccionados quedan FIJOS: la búsqueda solo filtra a los demás.
  const selectedOptions = useMemo<PedidoOption[]>(() => {
    const linkedById = new Map(linkedPedidos.map((pedido) => [pedido.id, pedido]));
    return value.map(
      (id) =>
        optionsById.get(id) ?? {
          id,
          folio: linkedById.get(id)?.folio ?? null,
          cliente: null,
          haystack: "",
          // Mientras el catálogo carga no se sabe si está disponible: no se avisa.
          unavailable: hasLoaded,
        },
    );
  }, [value, optionsById, linkedPedidos, hasLoaded]);

  const listedOptions = useMemo(() => {
    const term = search.toLowerCase().trim();
    const rest = options.filter(
      (option) => !selectedIds.has(option.id) && (!term || option.haystack.includes(term)),
    );
    return [...selectedOptions, ...rest];
  }, [options, selectedIds, selectedOptions, search]);

  // ── Virtualización de la lista ───────────────────────────────────────────
  // Mismo enfoque que el paso de productos: solo se montan los renglones
  // visibles del contenedor con scroll.
  const listRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: listedOptions.length,
    getScrollElement: () => listRef.current,
    // Alto aproximado de un renglón (folio + cliente); `measureElement` lo
    // corrige con el real.
    estimateSize: () => 62,
    overscan: 6,
    // Equivale al `space-y-1` de `SearchableSelectList`.
    gap: 4,
    getItemKey: (index) => listedOptions[index]?.id ?? index,
  });

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
        <div className="flex flex-col gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar pedido por folio o cliente..."
          />

          <div ref={listRef} className="max-h-60 overflow-y-auto pr-1">
            {options.length === 0 && selectedOptions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No hay pedidos disponibles para ligar.
              </p>
            ) : listedOptions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Ningún pedido coincide con la búsqueda.
              </p>
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const option = listedOptions[virtualItem.index];
                  // El índice puede venir de una lista más larga durante el
                  // render en que la lista se encoge (al filtrar).
                  if (!option) return null;
                  const selected = selectedIds.has(option.id);
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      {/* Mismo renglón que `SearchableSelectList`. */}
                      <button
                        type="button"
                        onClick={() => toggle(option)}
                        aria-pressed={selected}
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                          selected
                            ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                            : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                        }`}
                      >
                        {renderCheckboxIndicator(selected)}
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
                            {pedidoLabel(option)}
                          </span>
                          {option.unavailable ? (
                            <span className="block truncate text-xs text-amber-600 dark:text-amber-400">
                              Ya no está disponible (cancelado o inactivo). Desmárcalo para desligarlo.
                            </span>
                          ) : (
                            option.cliente && (
                              <span className={`block truncate text-xs ${MUTED_CLS}`}>
                                {option.cliente}
                              </span>
                            )
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {error?.message && (
        <p id={errorId} role="alert" className="ml-1 text-xs text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
    </div>
  );
}
