"use client";

import { useId, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { Loader } from "@/src/components/Loader";
import { XIcon } from "@/src/components/Icons";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";
import { useProductVariantSearchField } from "@/src/features/product-variants/hooks/useProductVariantSelector";
import { ProductVariantCodeBadges } from "@/src/features/product-variants/components/ProductVariantCodeBadges";
import { useProductionVariants } from "../hooks/useProductionVariants";
import { useMaquileros } from "@/src/features/suppliers/hooks/useMaquileros";
import {
  catalogOption,
  isOfferedForPedidos,
  matchesProductionOption,
  productionOption,
  type OpSkuOption,
} from "../utils/opSkuOptions";
import {
  ProductionOrderPedidoSelectorDialog,
  type SelectedProductionOrderPedido,
} from "./ProductionOrderPedidoSelectorDialog";

/** Datos de cabecera + variantes capturados en el Paso 1. */
export interface ProductionOrderStep1Data {
  prioridad: number;
  observaciones: string;
  /** Pedido especial vinculado (opcional); `null` = sin pedido. */
  pedido: SelectedProductionOrderPedido | null;
  /** SKU elegidos (catálogo y muestras), en el orden en que se eligieron. */
  skus: OpSkuOption[];
  /** Proveedor maquilero; `null` = se confecciona en casa. */
  centroConfeccion: number | null;
}

/**
 * Opciones de prioridad. El backend espera un número; el mapeo
 * 1 = Alta, 2 = Media, 3 = Baja sigue el orden del catálogo de prioridades.
 */
const PRIORIDAD_OPTIONS = [
  { value: 1, label: "Alta" },
  { value: 2, label: "Media" },
  { value: 3, label: "Baja" },
] as const;

interface ProductionOrderStep1Props {
  /** Valores iniciales para restaurar al regresar desde el Paso 2. */
  initialData: ProductionOrderStep1Data | null;
  /** Avanza al Paso 2 con la cabecera y las variantes seleccionadas. */
  onNext: (data: ProductionOrderStep1Data) => void;
  /** Cierra el asistente (este es el primer paso — no hay anterior). */
  onBack: () => void;
}

/** Convierte el value de un input a número, con 0 como respaldo. */
function toNumber(raw: string): number {
  if (raw === "") return 0;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * ProductionOrderStep1
 *
 * Paso 1 del asistente de orden de producción. Captura los campos de cabecera
 * (prioridad, observaciones y un pedido especial opcional, elegido en un
 * diálogo apilado) y una lista buscable de
 * selección múltiple de variantes de producto. La configuración por renglón
 * (BOM, cantidad, unidad y observaciones) ocurre en el Paso 2. "Continuar" se
 * habilita cuando hay al menos una variante seleccionada y una prioridad
 * elegida.
 */
export function ProductionOrderStep1({
  initialData,
  onNext,
  onBack,
}: ProductionOrderStep1Props) {
  // Dos fuentes de SKU:
  // - Catálogo: búsqueda EN EL SERVIDOR sobre el selector ligero de variantes
  //   (`producto-variante/selector/`, EC-886), una página por término. Solo
  //   trae variantes activas de productos activos, y cada fila su `tiene_bom`.
  // - Muestras SIN alta en catálogo (variantes de producción; las que ya
  //   tienen alta salen en el catálogo): lista corta, completa, filtrada aquí
  //   con el mismo término debounced.
  // Sin BOM se muestran pero no se eligen.
  const catalogSearch = useProductVariantSearchField();
  const {
    productionVariants,
    isLoading: isLoadingProduccion,
    isInitialError: isProduccionError,
  } = useProductionVariants();
  // Las muestras van como resultados LOCALES: siguen visibles y elegibles
  // aunque la búsqueda del catálogo esté cargando o haya fallado.
  const productionMatches = productionVariants
    .filter((variant) => !variant.aplica_catalogo)
    .map(productionOption)
    .filter((option) => matchesProductionOption(option, catalogSearch.term));
  const catalogResults: OpSkuOption[] = catalogSearch.variants.map(catalogOption);

  const [prioridad, setPrioridad] = useState<number>(
    initialData?.prioridad ?? 0,
  );
  const [observaciones, setObservaciones] = useState<string>(
    initialData?.observaciones ?? "",
  );
  const [pedido, setPedido] = useState<SelectedProductionOrderPedido | null>(
    initialData?.pedido ?? null,
  );
  const [isPedidoSelectorOpen, setIsPedidoSelectorOpen] = useState(false);
  const { maquileros, isLoading: isLoadingMaquileros } = useMaquileros();
  const [centroConfeccion, setCentroConfeccion] = useState<number | null>(
    initialData?.centroConfeccion ?? null,
  );
  // La etiqueta no envuelve ningún control (son botones que abren un diálogo):
  // cada botón la referencia vía `aria-describedby` para exponer el contexto.
  const pedidoLabelId = useId();
  const [selected, setSelected] = useState<OpSkuOption[]>(initialData?.skus ?? []);
  const isChosen = (option: OpSkuOption) => selected.some((s) => s.key === option.key);

  const toggleSku = (option: OpSkuOption) => {
    setSelected((prev) =>
      prev.some((s) => s.key === option.key)
        ? prev.filter((s) => s.key !== option.key)
        : [...prev, option],
    );
  };

  // EC-898: las muestras solo se ofrecen con pedido vinculado, y solo las de
  // ese pedido (ver `isOfferedForPedidos`). Lista para cuando la OP lleve
  // varios pedidos.
  const linkedPedidoIds = pedido ? [pedido.id] : [];
  const offeredProductionMatches = productionMatches.filter((option) =>
    isOfferedForPedidos(option, linkedPedidoIds),
  );

  /**
   * Cambia el pedido vinculado (o lo quita, con `null`) y quita de la
   * selección las muestras que ya no se ofrecen, avisando cuántas: si no,
   * seguirían fijas arriba y elegidas aunque la lista ya no las muestre.
   */
  const changePedido = (next: SelectedProductionOrderPedido | null) => {
    setPedido(next);
    const nextIds = next ? [next.id] : [];
    const removed = selected.filter((option) => !isOfferedForPedidos(option, nextIds));
    if (removed.length === 0) return;
    setSelected((prev) => prev.filter((option) => isOfferedForPedidos(option, nextIds)));
    const count =
      removed.length === 1 ? "Se quitó 1 muestra" : `Se quitaron ${removed.length} muestras`;
    toast(
      next
        ? `${count} que no ${removed.length === 1 ? "es" : "son"} del pedido ${next.label}.`
        : `${count}: sin pedido vinculado no se pueden incluir muestras.`,
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoadingProduccion) {
    return (
      <Loader
        title="Cargando variantes"
        message="Obteniendo variantes de producto disponibles..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  // Solo si las muestras nunca cargaron: un refetch fallido conserva la lista
  // (y la selección) y avisa por toast. Un fallo de la búsqueda del catálogo
  // se muestra DENTRO de la lista, con "Reintentar".
  if (isProduccionError) {
    return (
      <p className="text-sm text-red-500 p-4">
        Error al cargar las variantes de producto.
      </p>
    );
  }

  const selectedCount = selected.length;
  const canAdvance = selectedCount > 0 && prioridad > 0;

  const handleNext = () => {
    if (!canAdvance) return;
    onNext({ prioridad, observaciones, pedido, skus: selected, centroConfeccion });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Prioridad y pedido en una fila: son los dos datos de la orden. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
      <FormSelect
        label="Prioridad"
        name="prioridad"
        className="py-2!"
        value={prioridad}
        onChange={(event) => setPrioridad(toNumber(event.target.value))}
      >
        <option value="0" disabled>
          Seleccionar prioridad...
        </option>
        {PRIORIDAD_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
          >
            {option.label}
          </option>
        ))}
      </FormSelect>

      {/* Pedido relacionado — selección opcional vía diálogo apilado */}
      <div className="sm:col-span-2">
        <label
          id={pedidoLabelId}
          className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block"
        >
          Pedido relacionado (opcional)
        </label>

        {pedido ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-700/60 dark:bg-sky-900/20 px-3 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {pedido.label}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pedido vinculado a esta orden de producción
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPedidoSelectorOpen(true)}
                aria-describedby={pedidoLabelId}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-sky-200 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10 transition-colors"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => changePedido(null)}
                aria-label="Quitar pedido"
                aria-describedby={pedidoLabelId}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
              >
                <XIcon className="w-4 h-4" />
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsPedidoSelectorOpen(true)}
            aria-describedby={pedidoLabelId}
            className="w-full rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:border-sky-600 dark:hover:text-sky-300 cursor-pointer transition-colors"
          >
            + Relacionar a un pedido
          </button>
        )}
      </div>

      </div>

      {/* Quién confecciona: en casa o un maquilero (proveedor). */}
      <FormSelect
        label="Centro de confección"
        name="centro_confeccion"
        className="py-2!"
        value={centroConfeccion ?? ""}
        disabled={isLoadingMaquileros}
        onChange={(event) =>
          setCentroConfeccion(event.target.value === "" ? null : Number(event.target.value))
        }
      >
        <option value="" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
          Interno (se confecciona en casa)
        </option>
        {maquileros.map((supplier) => (
          <option
            key={supplier.id}
            value={supplier.id}
            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
          >
            {supplier.nombre}
          </option>
        ))}
      </FormSelect>
      {!isLoadingMaquileros && maquileros.length === 0 && (
        <p className="-mt-2 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
          Aún no hay maquileros. Márcalos en Compras → Proveedores → detalle → «Maquilero».
        </p>
      )}

      {/* Observaciones generales (opcionales) en una línea */}
      <FormTextarea
        label="Observaciones generales"
        name="observaciones"
        placeholder="Notas para toda la orden de producción (opcional)"
        rows={1}
        value={observaciones}
        onChange={(event) => setObservaciones(event.target.value)}
      />

      {/* Productos: encabezado con el conteo de seleccionados */}
      <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 dark:border-white/10 pt-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
          Productos
        </span>
        <span
          className={`text-xs font-semibold ${
            selectedCount > 0 ? "text-sky-600 dark:text-sky-400" : "text-slate-500"
          }`}
        >
          {selectedCount === 0
            ? "Ninguna variante seleccionada"
            : `${selectedCount} variante${selectedCount === 1 ? "" : "s"} seleccionada${selectedCount === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Búsqueda en el servidor + lista de selección múltiple. Lo elegido va
          fijo arriba (son los objetos completos de `selected`), aunque la
          búsqueda actual ya no lo traiga. */}
      <ServerSearchSelectList<OpSkuOption>
        search={catalogSearch.search}
        onSearchChange={catalogSearch.setSearch}
        results={catalogResults}
        localResults={offeredProductionMatches}
        pinned={selected}
        total={catalogSearch.total}
        hasResults={catalogSearch.hasResults}
        isInitialError={catalogSearch.isInitialError}
        isSearching={catalogSearch.isSearching}
        onRetry={() => void catalogSearch.refetch()}
        getItemDisabledReason={(option) =>
          option.tieneBom ? null : "Sin lista de materiales (BOM): no se puede fabricar todavía"
        }
        searchPlaceholder="Buscar variante por nombre, SKU, código Proscai o SKU de producción..."
        getKey={(option) => option.key}
        isSelected={isChosen}
        onSelect={toggleSku}
        emptyMessage="No hay variantes de producto disponibles."
        noResultsMessage="No se encontraron variantes"
        errorMessage="Error al buscar las variantes de producto."
        renderIndicator={renderCheckboxIndicator}
        renderContent={(option) => (
          <>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {option.nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="min-w-0 truncate">{option.sku}</span>
              {(option.kind === "produccion" || option.variant?.sku_produccion) && (
                <span className="shrink-0 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                  {option.kind === "produccion" ? "Muestra · sin catálogo" : "Muestra"}
                </span>
              )}
              {option.pedidoFolio && (
                <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {option.pedidoFolio}
                </span>
              )}
              {option.variant && <ProductVariantCodeBadges variant={option.variant} />}
            </p>
          </>
        )}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </button>

        <button
          type="button"
          disabled={!canAdvance}
          onClick={handleNext}
          className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all ${
            canAdvance
              ? "cursor-pointer hover:bg-sky-700 active:scale-[0.97]"
              : "cursor-not-allowed opacity-60"
          }`}
          aria-disabled={!canAdvance}
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Re-confirmar el MISMO pedido solo reescribe `{id, label}`: no hay
          datos derivados que se pierdan, así que no hace falta guarda. */}
      <ProductionOrderPedidoSelectorDialog
        open={isPedidoSelectorOpen}
        onOpenChange={setIsPedidoSelectorOpen}
        selectedPedidoId={pedido?.id ?? null}
        onSelect={changePedido}
      />
    </div>
  );
}
