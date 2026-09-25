"use client";

import { useId, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Loader } from "@/src/components/Loader";
import { CheckIcon, XIcon } from "@/src/components/Icons";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";
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
  variantIds: number[];
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
  const { productVariants, isLoading, isError } = useProductVariants(true);

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
  // La etiqueta no envuelve ningún control (son botones que abren un diálogo):
  // cada botón la referencia vía `aria-describedby` para exponer el contexto.
  const pedidoLabelId = useId();
  const [selectedIds, setSelectedIds] = useState<number[]>(
    initialData?.variantIds ?? [],
  );

  const toggleVariant = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando variantes"
        message="Obteniendo variantes de producto disponibles..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">
        Error al cargar las variantes de producto.
      </p>
    );
  }

  const selectedCount = selectedIds.length;
  const canAdvance = selectedCount > 0 && prioridad > 0;

  const handleNext = () => {
    if (!canAdvance) return;
    onNext({ prioridad, observaciones, pedido, variantIds: selectedIds });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Prioridad */}
      <FormSelect
        label="Prioridad"
        name="prioridad"
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

      {/* Observaciones generales */}
      <FormTextarea
        label="Observaciones generales"
        name="observaciones"
        placeholder="Notas para toda la orden de producción (opcional)"
        rows={2}
        value={observaciones}
        onChange={(event) => setObservaciones(event.target.value)}
      />

      {/* Pedido relacionado — selección opcional vía diálogo apilado */}
      <div>
        <label
          id={pedidoLabelId}
          className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block"
        >
          Pedido relacionado (opcional)
        </label>

        {pedido ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-700/60 dark:bg-sky-900/20 px-4 py-3">
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
                onClick={() => setPedido(null)}
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
            className="w-full rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:border-sky-600 dark:hover:text-sky-300 cursor-pointer transition-colors"
          >
            + Relacionar a un pedido
          </button>
        )}
      </div>

      {/* Selected count */}
      <p className="text-xs text-slate-500 font-medium">
        {selectedCount === 0
          ? "Ninguna variante seleccionada"
          : `${selectedCount} variante${selectedCount === 1 ? "" : "s"} seleccionada${selectedCount === 1 ? "" : "s"}`}
      </p>

      {/* Search + scrollable multi-select list */}
      <SearchableSelectList<ProductVariant>
        items={productVariants}
        searchPlaceholder="Buscar variante por nombre o SKU..."
        filterPredicate={(variant, term) =>
          variant.nombre.toLowerCase().includes(term) ||
          variant.sku.toLowerCase().includes(term)
        }
        getKey={(variant) => variant.id}
        isSelected={(variant) => selectedIds.includes(variant.id)}
        onSelect={(variant) => toggleVariant(variant.id)}
        emptyMessage="No hay variantes de producto disponibles."
        noResultsMessage="No se encontraron variantes"
        renderIndicator={(selected) => (
          // Check indicator
          <span
            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              selected
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-300 dark:border-slate-600"
            }`}
          >
            {selected && <CheckIcon className="w-3.5 h-3.5" />}
          </span>
        )}
        renderContent={(variant) => (
          <>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {variant.nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
              {variant.sku}
            </p>
          </>
        )}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-4">
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
        onSelect={setPedido}
      />
    </div>
  );
}
