"use client";

import type { FormFieldError } from "@/src/utils/getFieldError";
import { useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import MissingPrerequisites from "@/src/features/products/components/MissingPrerequisites";
import { InventariosIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { XIcon } from "@/src/components/Icons";
import { ProductVariantSearchDropdown } from "./ProductVariantSearchDropdown";
import { StockMovementPedidoSelectorDialog } from "./StockMovementPedidoSelectorDialog";
import { useStockMovementForm } from "../hooks/useStockMovementForm";
import { usePedidoDetail } from "@/src/features/orders/hooks/usePedidoDetail";
import { useSampleSkuSearch } from "../hooks/useSampleSkuSearch";
import { formatFolioCorto } from "@/src/features/orders/utils/pedidoFormat";
import { AJUSTE_OBSERVACIONES_MAX } from "../schemas/stock-movement.schema";

/**
 * Contenido del formulario — se monta solo cuando el diálogo está abierto,
 * por lo que los hooks de datos (useWarehouses, useLocations, useProductVariants)
 * solo se ejecutan bajo demanda.
 */
function StockMovementFormContent({ onClose }: { onClose: () => void }) {
  const {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    warehouseOptions,
    activeLocations,
    productVariants,
    resetCounter,
    movimientoTypeOptions,
    stockCheckResult,
    availableStock,
    isCheckingStock,
    handleCheckStock,
    resetStockCheck,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleReset,
    selectedPedido,
    pedidoError,
    handleSelectPedido,
    handleRemovePedido,
  } = useStockMovementForm({ onSuccess: onClose });

  // Estado local del diálogo de selección de pedido (apilado sobre este form).
  const [isPedidoSelectorOpen, setIsPedidoSelectorOpen] = useState(false);

  // ─── Suscripciones reactivas a campos del formulario ────────────────────
  const tipoMovimiento = useStore(form.store, (state) => state.values.tipo_movimiento);
  const almacenOrigenId = useStore(form.store, (state) => state.values.almacen_origen_id);
  const origenItem = useStore(form.store, (state) => state.values.origen_item);
  // Muestra solo en ENTRADA: producción le da entrada a su SKU.
  const isMuestra = tipoMovimiento === "ENTRADA" && origenItem === "MUESTRA";
  const observacionesValue = useStore(form.store, (state) => state.values.observaciones ?? "");

  const isAjuste = tipoMovimiento === "AJUSTE";
  // Se cuenta sobre el valor recortado — el backend recibe `observaciones.trim()`
  // (ver useStockMovementForm), así que el aviso debe reflejar lo que en verdad
  // se envía y no falsear un aviso de truncado por espacios finales.
  const observacionesTrimmedLength = observacionesValue.trim().length;
  const ajusteObservacionesOverflow =
    isAjuste && observacionesTrimmedLength > AJUSTE_OBSERVACIONES_MAX;

  // ─── Variantes activas (estable entre renders) ──────────────────────────
  // Evita recrear el arreglo filtrado en cada render y estabiliza la prop
  // `variants` del dropdown de búsqueda (memos internos no se invalidan).
  const activeVariants = useMemo(
    () => productVariants.filter((v) => v.activo),
    [productVariants],
  );

  // ─── Ubicaciones filtradas por almacén ──────────────────────────────────
  const ubicacionOrigenOptions = useMemo(
    () => {
      // No ofrecer ubicaciones hasta que se seleccione un almacén.
      if (almacenOrigenId <= 0) return [];
      return activeLocations
        .filter((l) => l.almacen === almacenOrigenId)
        .map((l) => ({
          value: l.id_ubicacion,
          label: `P${l.pasillo} · R${l.rack}`,
        }));
    },
    [activeLocations, almacenOrigenId],
  );

  // ─── Renderizado ────────────────────────────────────────────────────────
  if (isLoadingFormData) {
    return (
      <Loader
        className="py-12"
        title="Cargando datos"
        message="Cargando almacenes, ubicaciones y productos..."
      />
    );
  }

  // Si algún catálogo (almacenes/ubicaciones/variantes) NUNCA cargó, su lista
  // vacía se confundiría con un catálogo legítimamente vacío: se muestra un
  // error explícito, distinto de la pantalla de prerrequisitos. Mismo estado
  // que `StockTransferForm`.
  if (isErrorFormData) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudieron cargar los catálogos
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Revisa tu conexión e intenta abrir el diálogo de nuevo.
        </p>
      </div>
    );
  }

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <>
      <DialogHeader
        title="Nuevo Movimiento de Stock"
        subtitle="Registrar entrada, salida o ajuste de inventario"
        statusColor="sky"
      />

      <form onSubmit={handleFormSubmit} className="w-full space-y-6">
        <fieldset disabled={isPending} className="space-y-6">
          {/* ── Sección: Información General ─────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <InventariosIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Información General
                </h3>
                <p className="text-[11px] text-slate-500">Datos base del movimiento</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Tipo de movimiento */}
                <form.Field name="tipo_movimiento">
                  {(field) => (
                    <FormSelect
                      label="Tipo de Movimiento"
                      options={movimientoTypeOptions}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = event.target.value as typeof field.state.value;
                        field.handleChange(nextValue);
                        clearFieldError("tipo_movimiento");
                        // Salida y ajuste solo aplican a variantes del catálogo.
                        if (nextValue !== "ENTRADA") {
                          form.setFieldValue("origen_item", "VARIANTE");
                          clearFieldError("sku_muestra");
                        }
                        // Las observaciones ahora son opcionales para todo tipo de
                        // movimiento — el valor no se limpia al cambiar de tipo,
                        // pero sí cualquier error previo, para no dejarlo huérfano
                        // bajo la etiqueta genérica del campo.
                        clearFieldError("observaciones");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("tipo_movimiento")}
                    />
                  )}
                </form.Field>

                {/* Almacén Origen */}
                <form.Field name="almacen_origen_id">
                  {(field) => (
                    <FormSelect
                      label="Almacén Origen"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                        clearFieldError("almacen_origen_id");
                        // Resetear ubicación origen al cambiar almacén
                        form.setFieldValue("ubicacion_origen_id", 0);
                      }}
                      onBlur={field.handleBlur}
                      error={getError("almacen_origen_id")}
                    >
                      <option value="0" disabled>
                        Seleccionar almacén...
                      </option>
                      {warehouseOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>

                {/* Ubicación Origen */}
                <form.Field name="ubicacion_origen_id">
                  {(field) => (
                    <FormSelect
                      label="Ubicación Origen"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                        clearFieldError("ubicacion_origen_id");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("ubicacion_origen_id")}
                    >
                      <option value="0" disabled>
                        {almacenOrigenId === 0
                          ? "Selecciona un almacén primero..."
                          : ubicacionOrigenOptions.length === 0
                            ? "Sin ubicaciones en este almacén"
                            : "Seleccionar ubicación..."}
                      </option>
                      {ubicacionOrigenOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          {/* ── Sección: Producto y Cantidad ─────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <InventariosIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Producto
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isMuestra ? "SKU de la muestra y cantidad" : "Variante y cantidad del movimiento"}
                </p>
              </div>
              {/* Solo en ENTRADA: producto del catálogo o muestra por su SKU. */}
              {tipoMovimiento === "ENTRADA" && (
                <div
                  role="radiogroup"
                  aria-label="Qué entra al almacén"
                  className="ml-auto inline-flex rounded-lg bg-slate-100 dark:bg-white/5 p-0.5"
                >
                  {(
                    [
                      { value: "VARIANTE", label: "Producto" },
                      { value: "MUESTRA", label: "Muestra" },
                    ] as const
                  ).map((opcion) => {
                    const active = origenItem === opcion.value;
                    return (
                      <button
                        key={opcion.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          form.setFieldValue("origen_item", opcion.value);
                          clearFieldError("producto_variante_id");
                          clearFieldError("sku_muestra");
                          resetStockCheck();
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                          active
                            ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        {opcion.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* SKU de muestra (solo ENTRADA) o variante de producto */}
                {isMuestra ? (
                <form.Field name="sku_muestra">
                  {(field) => (
                    <div className="space-y-1.5">
                      <SampleSkuAutocomplete
                        value={field.state.value}
                        onChange={(sku) => {
                          field.handleChange(sku);
                          clearFieldError("sku_muestra");
                        }}
                        onBlur={field.handleBlur}
                        error={getError("sku_muestra")}
                      />
                      {selectedPedido ? (
                        <SampleSkuSuggestions
                          pedidoId={selectedPedido.id}
                          value={field.state.value}
                          onPick={(sku) => {
                            field.handleChange(sku);
                            clearFieldError("sku_muestra");
                          }}
                        />
                      ) : null}
                    </div>
                  )}
                </form.Field>
                ) : (
                <form.Field name="producto_variante_id">
                  {(field) => (
                    <div className="space-y-2">
                      <ProductVariantSearchDropdown
                        key={resetCounter}
                        variants={activeVariants}
                        value={field.state.value}
                        onChange={(variantId) => {
                          field.handleChange(variantId);
                          clearFieldError("producto_variante_id");
                          resetStockCheck();
                        }}
                        onBlur={field.handleBlur}
                        error={getError("producto_variante_id")}
                        disabled={isPending}
                      />

                      <div className="flex items-center gap-3 flex-nowrap">
                        <button
                          type="button"
                          onClick={handleCheckStock}
                          disabled={almacenOrigenId < 1 || field.state.value < 1 || isCheckingStock}
                          className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold leading-none rounded-lg cursor-pointer border border-sky-200 text-sky-700 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10 transition-colors"
                        >
                          {isCheckingStock ? "Consultando..." : "Consultar existencias"}
                        </button>

                        {stockCheckResult !== undefined && (
                          availableStock !== null ? (
                            <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                              Stock disponible:{" "}
                              <span className="font-bold text-slate-900 dark:text-white">
                                {availableStock.toLocaleString("es-MX")}
                              </span>
                            </span>
                          ) : (
                            <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                              Sin stock disponible para este producto.
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </form.Field>
                )}

                {/* Cantidad */}
                <form.Field name="cantidad">
                  {(field) => (
                    <FormInput
                      label="Cantidad"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      name={field.name}
                      value={field.state.value === 0 ? "" : String(field.state.value)}
                      onChange={(event) => {
                        const nextValue =
                          event.target.value === "" ? 0 : Number(event.target.value);
                        field.handleChange(Number.isFinite(nextValue) ? nextValue : 0);
                        clearFieldError("cantidad");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("cantidad")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          {/* ── Sección: Notas y Referencias ──────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-500/5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <InventariosIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Notas y Referencias
                </h3>
                <p className="text-[11px] text-slate-500">
                  Observaciones y pedido relacionado (opcionales)
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Observaciones — opcional para todo tipo de movimiento */}
              <div>
                <form.Field name="observaciones">
                  {(field) => (
                    <FormInput
                      label="Observaciones (opcional)"
                      placeholder={
                        isAjuste ? "Motivo del ajuste" : "Notas del movimiento"
                      }
                      forceUppercase
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldError("observaciones");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("observaciones")}
                    />
                  )}
                </form.Field>

                {/* Aviso suave del límite del backend para AJUSTE (no bloquea) */}
                {isAjuste && (
                  <p
                    className={`mt-1.5 text-[11px] ${
                      ajusteObservacionesOverflow
                        ? "text-amber-600 dark:text-amber-400 font-medium"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {ajusteObservacionesOverflow
                      ? `El ajuste guarda máximo ${AJUSTE_OBSERVACIONES_MAX} caracteres — el resto se truncará.`
                      : `${observacionesTrimmedLength}/${AJUSTE_OBSERVACIONES_MAX} caracteres máximo para ajustes.`}
                  </p>
                )}
              </div>

              {/* Pedido relacionado — selección opcional vía diálogo apilado */}
              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">
                  Pedido relacionado (opcional)
                </label>

                {selectedPedido ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-700/60 dark:bg-sky-900/20 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {selectedPedido.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pedido vinculado a este movimiento
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsPedidoSelectorOpen(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-sky-200 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10 transition-colors"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePedido}
                        aria-label="Quitar pedido"
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
                    className="w-full rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:border-sky-600 dark:hover:text-sky-300 cursor-pointer transition-colors"
                  >
                    + Relacionar a un pedido
                  </button>
                )}

                {/* Error específico del pedido (p. ej. "Pedido no encontrado.") */}
                {pedidoError && (
                  <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                    {pedidoError}
                  </p>
                )}
              </div>
            </div>
          </section>
        </fieldset>

        {/* ── Botones de acción ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending}>
            Registrar movimiento
          </FormSubmitButton>
        </div>
      </form>

      {/* Diálogo de selección de pedido — apilado ENCIMA del formulario, que
          permanece montado detrás para no perder su estado. */}
      <StockMovementPedidoSelectorDialog
        open={isPedidoSelectorOpen}
        onOpenChange={setIsPedidoSelectorOpen}
        selectedPedido={selectedPedido}
        onSelect={handleSelectPedido}
      />
    </>
  );
}

// ─── Componente público ──────────────────────────────────────────────────────

/**
 * Punto de entrada para la tabla.
 * Solo activa la carga de datos del formulario cuando el modal se abre.
 */

/**
 * Campo del SKU de muestra con autocompletado: al escribir (debounce 250 ms)
 * busca por SKU o folio y lista hasta 10 resultados; flechas + Enter o clic
 * eligen. Lo que se envía sigue siendo el texto del campo (`sku_muestra`).
 */
function SampleSkuAutocomplete({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (sku: string) => void;
  onBlur: () => void;
  error?: FormFieldError;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const { results, isSearching, isError, term } = useSampleSkuSearch(value);
  // `fixed` desde el input, como `ProductVariantSearchDropdown`: la tarjeta
  // tiene `overflow-hidden` y recortaría una lista `absolute`.
  const inputRef = useRef<HTMLInputElement>(null);
  const [listStyle, setListStyle] = useState<React.CSSProperties>({});
  const placeList = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setListStyle({ position: "fixed", top: rect.bottom + 8, left: rect.left, width: rect.width, zIndex: 9999 });
    }
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);
  // Ya elegido (coincide exacto con un resultado): no hace falta la lista.
  const exact = results.some((r) => r.sku_muestra.toUpperCase() === value.trim().toUpperCase());
  const showList = open && value.trim().length > 0 && !exact;
  const pick = (sku: string) => {
    onChange(sku);
    setOpen(false);
  };

  return (
    <div className="relative">
      <FormInput
        ref={inputRef}
        label="SKU de la muestra"
        placeholder="Busca por SKU o folio del pedido"
        name="sku_muestra"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls="sku-muestra-sugerencias"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => {
          placeList();
          setOpen(true);
        }}
        onBlur={() => {
          // Deja terminar el clic sobre una sugerencia antes de cerrar.
          setTimeout(() => setOpen(false), 120);
          onBlur();
        }}
        onKeyDown={(event) => {
          if (!showList || results.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted((i) => Math.min(i + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            pick(results[highlighted]?.sku_muestra ?? value);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        error={error}
      />
      {showList && (
        <ul
          id="sku-muestra-sugerencias"
          role="listbox"
          style={listStyle}
          className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg p-1"
        >
          {isSearching && results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-400">Buscando…</li>
          ) : isError ? (
            <li className="px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
              No se pudo buscar. Intenta de nuevo.
            </li>
          ) : results.length === 0 && term ? (
            <li className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              Sin muestras que coincidan.
            </li>
          ) : (
            results.map((r, index) => (
              <li
                key={`${r.variante_produccion}-${r.sku_muestra}`}
                role="option"
                aria-selected={index === highlighted}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(r.sku_muestra)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer ${
                  index === highlighted ? "bg-violet-50 dark:bg-violet-500/10" : ""
                }`}
              >
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-white">
                  {r.sku_muestra}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {[r.nombre, r.talla && `Talla ${r.talla}`].filter(Boolean).join(" · ")}
                </span>
                {r.pedido_folio && (
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                    title={r.pedido_folio}
                  >
                    {formatFolioCorto(r.pedido_folio)}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * SKUs de muestra del pedido relacionado, para elegir con un clic. Una sola
 * lectura del detalle del pedido (en caché con `["pedido-detail", id]`, la
 * misma que usa el detalle 360°), así que es inmediata al reabrir.
 */
function SampleSkuSuggestions({
  pedidoId,
  value,
  onPick,
}: {
  pedidoId: number;
  value: string;
  onPick: (sku: string) => void;
}) {
  const { data: pedido, isLoading } = usePedidoDetail(pedidoId);
  if (isLoading) {
    return <p className="text-[11px] text-slate-400 dark:text-slate-500">Buscando SKUs de muestra…</p>;
  }
  const skus = (pedido?.detalles ?? []).flatMap((linea) =>
    linea.tallas
      .filter((talla) => talla.sku_muestra?.trim())
      .map((talla) => ({
        sku: talla.sku_muestra!.trim(),
        detalle: [linea.producto_nombre_externo || linea.producto_nombre, talla.talla_nombre]
          .filter(Boolean)
          .join(" · "),
      })),
  );
  if (skus.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Este pedido no tiene SKUs de muestra vinculados.
      </p>
    );
  }
  const typed = value.trim().toUpperCase();
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="SKUs de muestra del pedido">
      {skus.map((item) => {
        const active = item.sku.toUpperCase() === typed;
        return (
          <button
            key={item.sku}
            type="button"
            onClick={() => onPick(item.sku)}
            title={item.detalle}
            aria-pressed={active}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
              active
                ? "border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-400/40 dark:bg-violet-500/20 dark:text-violet-300"
                : "border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
            }`}
          >
            {item.sku}
          </button>
        );
      })}
    </div>
  );
}

export const StockMovementForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title=""
      maxWidth="650px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <InventariosIcon className="w-4 h-4" />
          Nuevo movimiento
        </Button>
      }
    >
      {isDialogOpen && <StockMovementFormContent onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
