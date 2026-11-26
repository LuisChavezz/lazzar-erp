/**
 * ReceiptOrderSelector.tsx
 *
 * Paso 1 del flujo de recepción — "Seleccionar Orden".
 *
 * Decisión de diseño: el tipo de orden (Compra vs Producción) se elige con un
 * toggle DENTRO de este mismo paso, NO como un paso adicional del wizard. Así
 * "PASO 1 DE 2" y el `StepProgressBar` no cambian. Las dos listas NUNCA se
 * mezclan: el toggle decide cuál (`ordenes_compra` u `ordenes_produccion`) se
 * filtra y muestra. Compra es el valor por defecto (preserva el comportamiento
 * previo). Al cambiar de tipo se limpia la selección, ya que pertenece a la
 * otra lista.
 *
 * La pestaña Producción lista también las SM pendientes de recibir (EC-912):
 * ver `utils/receiptCandidates.ts`.
 */

"use client";

import { useMemo, useState } from "react";
import { useReceiptOnboardingData } from "../hooks/useReceiptOnboardingData";
import { onboardingLoadErrorMessage } from "@/src/features/purchase-orders/utils/onboardingLoadError";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { Loader } from "@/src/components/Loader";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { formatLocalDate } from "@/src/utils/formatDate";
import {
  TIPO_COMPRA_OPTIONS,
  tipoCompraLabel,
  type TipoCompra,
} from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
import type {
  ReceiptOnboardingData,
  ReceiptOnboardingPurchaseOrder,
  ReceiptOrderCandidate,
  ReceiptOrderType,
} from "../interfaces/receipt-onboarding.interface";
import {
  buildProductionTabRows,
  ocRowKey,
  productionTabRowCandidate,
  productionTabRowDisabledReason,
  productionTabRowKey,
  productionTabRowMatches,
  salidaMaquilaOrigenNombre,
  salidaMaquilaPendienteTexto,
  type ProductionTabRow,
} from "../utils/receiptCandidates";

interface ReceiptOrderSelectorProps {
  orderType: ReceiptOrderType;
  onOrderTypeChange: (type: ReceiptOrderType) => void;
  /** Llave de la fila elegida (`candidateKey`): los ids de OP y SM pueden coincidir. */
  selectedKey: string | null;
  onSelect: (candidate: ReceiptOrderCandidate | null) => void;
}

/** Estado de la consulta de onboarding que alimenta la lista. */
export interface ReceiptOrderSelectorSource {
  onboardingData: ReceiptOnboardingData | undefined;
  isLoading: boolean;
  isInitialError: boolean;
  error: unknown;
}

interface ReceiptOrderSelectorViewProps extends ReceiptOrderSelectorProps {
  source: ReceiptOrderSelectorSource;
  /**
   * Lista también las SM por recibir en la pestaña Producción (EC-912). El
   * encuadre RFID (EC-961) las oculta: se levanta solo sobre una OC u OP.
   */
  includeSalidasMaquila?: boolean;
}

/** Altura fija de la lista: llena el diálogo sin hueco y no salta al filtrar. */
const LIST_HEIGHT = "h-72";

const ORDER_TYPE_OPTIONS: { value: ReceiptOrderType; label: string }[] = [
  { value: "compra", label: "Orden de Compra" },
  { value: "produccion", label: "Orden de Producción" },
];

// Filtro de tipo de compra de la pestaña Compra: "todos" o un `TipoCompra`.
// Se filtra en memoria sobre `busqueda.ordenes_compra` (sin `?tipo_compra=`),
// así que cambiarlo no dispara ninguna consulta.
type PurchaseTypeFilter = TipoCompra | "todos";

const PURCHASE_TYPE_FILTER_OPTIONS: { value: PurchaseTypeFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  ...TIPO_COMPRA_OPTIONS,
];

/** Paso 1 de "Nueva Recepción", alimentado por `recepciones/onboarding/`. */
export function ReceiptOrderSelector(props: ReceiptOrderSelectorProps) {
  return <ReceiptOrderSelectorView {...props} source={useReceiptOnboardingData()} />;
}

/**
 * La lista de órdenes sin su consulta: la recibe en `source`. La reutiliza el
 * alta del encuadre RFID (EC-961) con `recepcion-rfid-encuadres/onboarding/`,
 * que responde la misma forma.
 */
export function ReceiptOrderSelectorView({
  orderType,
  onOrderTypeChange,
  selectedKey,
  onSelect,
  source,
  includeSalidasMaquila = true,
}: ReceiptOrderSelectorViewProps) {
  const { onboardingData, isLoading, isInitialError: isError, error } = source;
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>("todos");

  // Stabilise references so downstream reads don't recalculate every render
  const purchaseOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_compra ?? [],
    [onboardingData?.busqueda.ordenes_compra],
  );
  // OPs y SMs pendientes en una sola lista (EC-912). Cada fila con llave
  // propia (`op-`/`sm-`): la OP 12 y la SM 12 son filas distintas.
  const productionRows = useMemo(
    () =>
      buildProductionTabRows(
        onboardingData?.busqueda.ordenes_produccion ?? [],
        includeSalidasMaquila ? (onboardingData?.busqueda.salidas_maquila ?? []) : [],
      ),
    [onboardingData?.busqueda.ordenes_produccion, onboardingData?.busqueda.salidas_maquila, includeSalidasMaquila],
  );

  const filteredPurchaseOrders =
    purchaseTypeFilter === "todos"
      ? purchaseOrders
      : purchaseOrders.filter((order) => order.tipo_compra === purchaseTypeFilter);

  const isCompra = orderType === "compra";
  const activeCount = isCompra ? purchaseOrders.length : productionRows.length;
  const bothEmpty = purchaseOrders.length === 0 && productionRows.length === 0;

  const handleTypeChange = (next: ReceiptOrderType) => {
    if (next === orderType) return;
    onSelect(null); // La selección pertenece a la otra lista — limpiar
    onOrderTypeChange(next);
  };

  // Mismo mecanismo que el toggle de tipo de orden: la selección podría
  // quedar fuera de la lista filtrada (`SearchableSelectList` no la fija
  // arriba, issue #262), así que se limpia antes de cambiar el filtro.
  const handlePurchaseTypeFilterChange = (next: PurchaseTypeFilter) => {
    if (next === purchaseTypeFilter) return;
    onSelect(null);
    setPurchaseTypeFilter(next);
  };

  // ── Loading state (single query loads both lists) ─────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando órdenes"
        message="Obteniendo lista de órdenes..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-4">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Error al cargar las órdenes
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          {onboardingLoadErrorMessage(error)}
        </p>
      </div>
    );
  }

  // ── Estado vacío total: ningún tipo de orden tiene resultados ─────────────
  if (bothEmpty) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No hay órdenes disponibles para recepcionar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Order-type toggle — las dos listas NO se mezclan */}
      <SegmentedControl
        options={ORDER_TYPE_OPTIONS}
        value={orderType}
        onChange={handleTypeChange}
        className="self-start"
      />

      {/* Altura mínima fija del área de la lista: así filtrar por tipo o
          cambiar Compra/Producción no encoge el diálogo, que al estar
          centrado se recolocaría y movería los controles bajo el cursor. */}
      <div className="flex flex-col gap-3">
        {activeCount === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {isCompra
              ? "No hay órdenes de compra disponibles."
              : includeSalidasMaquila
                ? "No hay órdenes de producción ni salidas a maquila por recibir."
                : "No hay órdenes de producción por recibir."}
          </p>
        ) : isCompra ? (
          <>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tipo de compra
              </span>
              {/* En pantalla angosta ocupa todo el ancho y reparte el espacio
                  entre las tres opciones (con menos padding) para no desbordar
                  el diálogo; desde `sm` recupera el aspecto del toggle. */}
              <SegmentedControl
                options={PURCHASE_TYPE_FILTER_OPTIONS}
                value={purchaseTypeFilter}
                onChange={handlePurchaseTypeFilterChange}
                className="w-full sm:w-auto [&>button]:flex-1 [&>button]:px-2 sm:[&>button]:flex-none sm:[&>button]:px-5"
              />
            </div>
            <SearchableSelectList<ReceiptOnboardingPurchaseOrder>
              listClassName={LIST_HEIGHT}
              key="compra"
              items={filteredPurchaseOrders}
              searchPlaceholder="Buscar por folio, proveedor o tipo..."
              filterPredicate={(order, term) =>
                (order.folio ?? "").toLowerCase().includes(term) ||
                (order.proveedor_nombre ?? "").toLowerCase().includes(term) ||
                tipoCompraLabel(order.tipo_compra).toLowerCase().includes(term)
              }
              getKey={(order) => order.id}
              isSelected={(order) => ocRowKey(order.id) === selectedKey}
              onSelect={(order) =>
                onSelect(
                  selectedKey === ocRowKey(order.id)
                    ? null
                    : { type: "compra", order },
                )
              }
              emptyMessage="No hay órdenes de compra de este tipo."
              noResultsMessage="No se encontraron órdenes de compra"
              renderIndicator={renderRadioIndicator}
              renderContent={(order) => (
                <>
                  <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {order.folio ?? "Sin folio"}
                  </p>
                  {/* `flex-wrap` y no `shrink-0` en el tipo: así, en pantalla
                      angosta, el tipo baja de renglón en vez de imponer su
                      ancho completo a la fila (y ensanchar el diálogo). */}
                  <p className="flex flex-wrap min-w-0 gap-x-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-full">{order.proveedor_nombre}</span>
                    <span className="whitespace-nowrap">· {tipoCompraLabel(order.tipo_compra)}</span>
                  </p>
                </>
              )}
            />
          </>
        ) : (
          <SearchableSelectList<ProductionTabRow>
            key="produccion"
            items={productionRows}
            listClassName={LIST_HEIGHT}
            searchPlaceholder="Buscar por folio o maquilero..."
            filterPredicate={productionTabRowMatches}
            getKey={productionTabRowKey}
            isSelected={(row) => productionTabRowKey(row) === selectedKey}
            // La fila elegida sigue a la vista aunque la búsqueda la excluya:
            // "Siguiente" nunca aplica a una selección invisible.
            pinSelected
            getItemDisabledReason={productionTabRowDisabledReason}
            onSelect={(row) =>
              onSelect(
                selectedKey === productionTabRowKey(row)
                  ? null
                  : productionTabRowCandidate(row),
              )
            }
            emptyMessage="No hay órdenes de producción disponibles."
            noResultsMessage="No se encontraron órdenes de producción"
            renderIndicator={renderRadioIndicator}
            renderContent={(row) =>
              row.kind === "op" ? (
                <>
                  <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {row.order.folio}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {row.order.pedido_id !== null
                      ? `Pedido #${row.order.pedido_id}`
                      : `Inicio: ${formatLocalDate(row.order.fecha_inicio)}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {row.salidaMaquila.origen_folio}
                  </p>
                  {/* Sin el `total` de la SM: recibir no es ver costos. */}
                  <p className="flex flex-wrap min-w-0 gap-x-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="whitespace-nowrap">
                      {row.salidaMaquila.folio} · {salidaMaquilaOrigenNombre(row.salidaMaquila)}
                    </span>
                    <span className="truncate max-w-full">
                      · {row.salidaMaquila.centro_confeccion_nombre}
                    </span>
                  </p>
                  {salidaMaquilaPendienteTexto(row.salidaMaquila) && (
                    <p className="text-xs font-medium tabular-nums text-amber-700 dark:text-amber-300">
                      {salidaMaquilaPendienteTexto(row.salidaMaquila)}
                    </p>
                  )}
                </>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
