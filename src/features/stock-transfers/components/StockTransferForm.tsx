"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import {
  TraspasosIcon,
  InfoIcon,
  XIcon,
  PlusIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from "@/src/components/Icons";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useStockTransferForm } from "../hooks/useStockTransferForm";
import { StockTransferProductSelectorDialog } from "./StockTransferProductSelectorDialog";
import {
  SAME_WAREHOUSE_MESSAGE,
  resolveItemSelection,
  type ItemKind,
} from "../schemas/stock-transfer.schema";

const ITEM_KIND_OPTIONS: { value: ItemKind; label: string }[] = [
  { value: "producto", label: "Producto" },
  { value: "producto_variante", label: "Variante" },
];

/** Opciones de ubicación de un almacén concreto — misma lógica para origen y
 *  destino, parametrizada por cuál almacén y qué lista de ubicaciones activas. */
function locationOptionsFor(
  activeLocations: { almacen: number; id_ubicacion: number; pasillo: string; rack: string }[],
  almacenId: number,
) {
  if (almacenId <= 0) return [];
  return activeLocations
    .filter((l) => l.almacen === almacenId)
    .map((l) => ({ value: l.id_ubicacion, label: `P${l.pasillo} · R${l.rack}` }));
}

/**
 * Disparador del selector: mismo lenguaje visual que `FormSelect` (borde,
 * fondo, chevron) para leerse como un selector — no como un campo de texto
 * buscable — aunque abra un diálogo apilado en vez de un `<select>` nativo.
 */
function ItemPickerButton({
  label,
  placeholder,
  selectedLabel,
  onClick,
  error,
  disabled,
}: {
  label: string;
  placeholder: string;
  selectedLabel: string | null;
  onClick: () => void;
  error?: FormFieldError;
  disabled?: boolean;
}) {
  return (
    <div className="group/field w-full">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`
            w-full text-left cursor-pointer
            bg-slate-50 dark:bg-black/20
            border border-slate-300 dark:border-slate-700
            rounded-xl px-4 py-3 pr-10 text-sm font-medium
            outline-none transition-all
            focus:ring-2 focus:ring-brand-500/20
            focus:border-brand-500
            focus:bg-white dark:focus:bg-black/40
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
          `}
        >
          <span
            className={`block truncate ${
              selectedLabel ? "text-slate-900 dark:text-white" : "text-slate-400"
            }`}
          >
            {selectedLabel ?? placeholder}
          </span>
        </button>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
          <ChevronDownIcon className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
          {error.message}
        </p>
      )}
    </div>
  );
}

/** Forma mínima de un campo de `form.Field` que consumen los selectores de
 *  abajo — el binding real (con su ruta tipada) se hace en el call site. */
interface BoundNumberField {
  name: string;
  state: { value: number };
  handleChange: (value: number) => void;
  handleBlur: () => void;
}

/**
 * Selector de almacén (Origen o Destino): excluye de sus opciones el almacén ya
 * elegido en el OTRO selector (`excludeValue`), tanto Origen como Destino lo
 * usan de la misma forma, por lo que la exclusión es simétrica por
 * construcción — ya no es posible aplicarla solo en una dirección, como ocurría
 * cuando cada selector tenía su propio bloque de JSX escrito a mano.
 */
function WarehouseSelectField({
  label,
  field,
  excludeValue,
  excludeLabelSuffix,
  warehouseOptions,
  onChangeExtra,
  getError,
  errorPath,
}: {
  label: string;
  field: BoundNumberField;
  /** Valor actualmente elegido en el OTRO selector — se deshabilita aquí. */
  excludeValue: number;
  excludeLabelSuffix: string;
  warehouseOptions: { value: number; label: string }[];
  /** Efectos adicionales al cambiar (revalidar el par, resetear ubicaciones). */
  onChangeExtra: (value: number) => void;
  getError: (path: string) => FormFieldError | undefined;
  errorPath: string;
}) {
  return (
    <FormSelect
      label={label}
      name={field.name}
      value={field.state.value}
      onChange={(event) => {
        const next = Number(event.target.value);
        const value = Number.isNaN(next) ? 0 : next;
        field.handleChange(value);
        onChangeExtra(value);
      }}
      onBlur={field.handleBlur}
      error={getError(errorPath)}
    >
      <option value="0" disabled>
        Seleccionar almacén...
      </option>
      {warehouseOptions.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
          disabled={opt.value === excludeValue}
        >
          {opt.label}
          {opt.value === excludeValue ? excludeLabelSuffix : ""}
        </option>
      ))}
    </FormSelect>
  );
}

/** Selector de ubicación (Origen o Destino) de una línea: deshabilitado hasta
 *  elegir el almacén correspondiente, con el mismo texto de placeholder según
 *  haya o no ubicaciones activas en ese almacén. */
function LocationSelectField({
  label,
  field,
  almacenId,
  noWarehouseLabel,
  options,
  onChangeExtra,
  getError,
  errorPath,
}: {
  label: string;
  field: BoundNumberField;
  /** Almacén (origen o destino) que gatea esta lista de ubicaciones. */
  almacenId: number;
  /** Placeholder cuando aún no se ha elegido `almacenId`. */
  noWarehouseLabel: string;
  options: { value: number; label: string }[];
  onChangeExtra: () => void;
  getError: (path: string) => FormFieldError | undefined;
  errorPath: string;
}) {
  return (
    <FormSelect
      label={label}
      name={field.name}
      value={field.state.value}
      disabled={almacenId <= 0}
      onChange={(event) => {
        const next = Number(event.target.value);
        field.handleChange(Number.isNaN(next) ? 0 : next);
        onChangeExtra();
      }}
      onBlur={field.handleBlur}
      error={getError(errorPath)}
    >
      <option value="0">
        {almacenId <= 0
          ? noWarehouseLabel
          : options.length === 0
            ? "Sin ubicaciones en este almacén"
            : "Sin ubicación"}
      </option>
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
        >
          {opt.label}
        </option>
      ))}
    </FormSelect>
  );
}

/**
 * Cuerpo del formulario — se monta solo cuando el diálogo está abierto, por lo
 * que los catálogos (almacenes, ubicaciones, productos, variantes) se cargan
 * bajo demanda.
 */
function StockTransferFormContent({ onClose }: { onClose: () => void }) {
  const {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    warehouseOptions,
    activeLocations,
    productOptions,
    variantOptions,
    lineKeys,
    serverBanner,
    bannerErrorTick,
    dismissBanner,
    getError,
    clearError,
    setFieldError,
    addLine,
    removeLine,
    handleFormSubmit,
    handleReset,
  } = useStockTransferForm({ onSuccess: onClose });

  // Al rechazar el backend el traspaso, el banner de "todo o nada" aparece al
  // inicio del formulario; si el usuario está desplazado hacia una línea
  // posterior, el aviso queda fuera de vista. `bannerErrorTick` cambia en CADA
  // rechazo (incluso con el mismo mensaje que el intento anterior), así que el
  // scroll se dispara en cada envío fallido, no solo en el primero.
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bannerErrorTick > 0) {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bannerErrorTick]);

  // ── Selector de producto/variante apilado ────────────────────────────────
  // Guarda qué línea (índice) y en qué modo abrió el diálogo, para escribir la
  // selección de vuelta en esa línea concreta. `null` = cerrado.
  const [picker, setPicker] = useState<{ index: number; mode: ItemKind } | null>(null);

  // ── Suscripciones reactivas ──────────────────────────────────────────────
  const almacenOrigen = useStore(form.store, (state) => state.values.almacen_origen);
  const almacenDestino = useStore(form.store, (state) => state.values.almacen_destino);
  const lineCount = useStore(
    form.store,
    (state) => state.values.transferencia_detalle.length,
  );

  // ── Ubicaciones filtradas por almacén ────────────────────────────────────
  const originLocationOptions = useMemo(
    () => locationOptionsFor(activeLocations, almacenOrigen),
    [activeLocations, almacenOrigen],
  );

  const destinationLocationOptions = useMemo(
    () => locationOptionsFor(activeLocations, almacenDestino),
    [activeLocations, almacenDestino],
  );

  // ── Handlers de almacén: al cambiar, invalidan las ubicaciones de línea ───
  const resetLineLocations = (key: "ubicacion_origen" | "ubicacion_destino") => {
    const lines = form.getFieldValue("transferencia_detalle") ?? [];
    lines.forEach((_, index) => {
      form.setFieldValue(`transferencia_detalle[${index}].${key}`, 0);
    });
  };

  // ── Validación en vivo del par origen/destino ─────────────────────────────
  // Si ambos almacenes están informados y son iguales, fija el error en el mismo
  // campo que usa el schema al enviar (`almacen_destino`, con el mismo mensaje);
  // si no, lo limpia. Se invoca al cambiar CUALQUIERA de los dos, de modo que un
  // estado inválido —si se alcanzara pese a que cada lista deshabilita el almacén
  // ya elegido en la otra— se refleje al instante y no solo al enviar.
  const validateWarehousePair = (origen: number, destino: number) => {
    if (origen > 0 && destino > 0 && origen === destino) {
      setFieldError("almacen_destino", SAME_WAREHOUSE_MESSAGE);
    } else {
      clearError("almacen_destino");
    }
  };

  // ── Estados de carga / prerrequisitos ────────────────────────────────────
  if (isLoadingFormData) {
    return (
      <Loader
        className="py-12"
        title="Cargando datos"
        message="Cargando almacenes, ubicaciones y productos..."
      />
    );
  }

  // Si algún catálogo (almacenes/ubicaciones/productos/variantes) falló, NO se
  // renderiza el formulario con selects vacíos —que se confundirían con catálogos
  // legítimamente vacíos y mandarían al usuario a "crear" datos que sí existen—:
  // se muestra un error explícito, distinto de la pantalla de prerrequisitos.
  // Mismo patrón que `RegisterPendingInvoiceDialog` (CxC).
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
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <InfoIcon className="w-6 h-6" />
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Faltan configuraciones para registrar un traspaso
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Antes de trasladar existencias, verifica lo siguiente:
              </p>
            </div>
            <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} className="w-full space-y-6">
        {/* ── Banner de "todo o nada" ──────────────────────────────────── */}
        {serverBanner && (
          <div
            ref={bannerRef}
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
          >
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                {serverBanner}
              </p>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                La operación es atómica: no se creó ningún movimiento.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Descartar aviso"
              className="shrink-0 p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <fieldset disabled={isPending} className="space-y-6">
          {/* ── Sección: Almacenes ─────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <TraspasosIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Almacenes
                </h3>
                <p className="text-[11px] text-slate-500">Origen y destino del traspaso</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Almacén Origen */}
                <form.Field name="almacen_origen">
                  {(field) => (
                    <WarehouseSelectField
                      label="Almacén Origen"
                      field={field}
                      excludeValue={almacenDestino}
                      excludeLabelSuffix=" (destino)"
                      warehouseOptions={warehouseOptions}
                      getError={getError}
                      errorPath="almacen_origen"
                      onChangeExtra={(value) => {
                        clearError("almacen_origen");
                        // Revalida el par contra el destino actual (fija o limpia
                        // el error origen == destino en el acto).
                        validateWarehousePair(value, almacenDestino);
                        resetLineLocations("ubicacion_origen");
                      }}
                    />
                  )}
                </form.Field>

                {/* Almacén Destino */}
                <form.Field name="almacen_destino">
                  {(field) => (
                    <WarehouseSelectField
                      label="Almacén Destino"
                      field={field}
                      excludeValue={almacenOrigen}
                      excludeLabelSuffix=" (origen)"
                      warehouseOptions={warehouseOptions}
                      getError={getError}
                      errorPath="almacen_destino"
                      onChangeExtra={(value) => {
                        // Revalida el par contra el origen actual (fija o limpia
                        // el error origen == destino en el acto).
                        validateWarehousePair(almacenOrigen, value);
                        resetLineLocations("ubicacion_destino");
                      }}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          {/* ── Sección: Líneas del traspaso ───────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <TraspasosIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Artículos a trasladar
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Una línea por producto o variante
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Agregar línea
              </button>
            </div>

            <div className="p-6">
              {/* Error a nivel del arreglo (ej. "Agrega al menos una línea"). */}
              {getError("transferencia_detalle") && (
                <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("transferencia_detalle")?.message}
                </p>
              )}

              <form.Field name="transferencia_detalle" mode="array">
                {(arrayField) => (
                  <div className="space-y-4">
                    {arrayField.state.value.map((_, index) => {
                      const lineFormError = getError(
                        `transferencia_detalle.${index}._form`,
                      );
                      return (
                        <div
                          key={lineKeys[index] ?? index}
                          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-4"
                        >
                          {/* Encabezado de la línea */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                                {index + 1}
                              </span>
                              <form.Field name={`transferencia_detalle[${index}].tipo_item`}>
                                {(tipoField) => (
                                  <SegmentedControl<ItemKind>
                                    options={ITEM_KIND_OPTIONS}
                                    value={tipoField.state.value}
                                    onChange={(next) => {
                                      tipoField.handleChange(next);
                                      // Al cambiar el tipo, se limpia el id que
                                      // deja de aplicar para garantizar el XOR —
                                      // misma resolución que usan `buildTransferPayload`
                                      // y el `superRefine` del schema.
                                      const resolved = resolveItemSelection(
                                        next,
                                        form.getFieldValue(
                                          `transferencia_detalle[${index}].producto`,
                                        ),
                                        form.getFieldValue(
                                          `transferencia_detalle[${index}].producto_variante`,
                                        ),
                                      );
                                      form.setFieldValue(
                                        `transferencia_detalle[${index}].producto`,
                                        resolved.producto ?? 0,
                                      );
                                      form.setFieldValue(
                                        `transferencia_detalle[${index}].producto_variante`,
                                        resolved.producto_variante ?? 0,
                                      );
                                      clearError(`transferencia_detalle.${index}.producto`);
                                      clearError(
                                        `transferencia_detalle.${index}.producto_variante`,
                                      );
                                    }}
                                  />
                                )}
                              </form.Field>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              disabled={lineCount <= 1}
                              aria-label="Quitar línea"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
                            >
                              <XIcon className="w-4 h-4" />
                              Quitar
                            </button>
                          </div>

                          {/* Producto XOR Variante (según el tipo) + Cantidad */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <form.Field name={`transferencia_detalle[${index}].tipo_item`}>
                              {(tipoField) =>
                                tipoField.state.value === "producto" ? (
                                  <form.Field
                                    name={`transferencia_detalle[${index}].producto`}
                                  >
                                    {(field) => (
                                      <ItemPickerButton
                                        label="Producto"
                                        placeholder="Seleccionar producto..."
                                        selectedLabel={
                                          productOptions.find(
                                            (o) => o.id === field.state.value,
                                          )?.label ?? null
                                        }
                                        onClick={() =>
                                          setPicker({ index, mode: "producto" })
                                        }
                                        error={getError(
                                          `transferencia_detalle.${index}.producto`,
                                        )}
                                        disabled={isPending}
                                      />
                                    )}
                                  </form.Field>
                                ) : (
                                  <form.Field
                                    name={`transferencia_detalle[${index}].producto_variante`}
                                  >
                                    {(field) => (
                                      <ItemPickerButton
                                        label="Variante de Producto"
                                        placeholder="Seleccionar variante..."
                                        selectedLabel={
                                          variantOptions.find(
                                            (o) => o.id === field.state.value,
                                          )?.label ?? null
                                        }
                                        onClick={() =>
                                          setPicker({
                                            index,
                                            mode: "producto_variante",
                                          })
                                        }
                                        error={getError(
                                          `transferencia_detalle.${index}.producto_variante`,
                                        )}
                                        disabled={isPending}
                                      />
                                    )}
                                  </form.Field>
                                )
                              }
                            </form.Field>

                            {/* Cantidad (string decimal) */}
                            <form.Field name={`transferencia_detalle[${index}].cantidad`}>
                              {(field) => (
                                <FormInput
                                  label="Cantidad"
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0.0000"
                                  name={field.name}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    field.handleChange(event.target.value);
                                    clearError(
                                      `transferencia_detalle.${index}.cantidad`,
                                    );
                                  }}
                                  onBlur={field.handleBlur}
                                  error={getError(
                                    `transferencia_detalle.${index}.cantidad`,
                                  )}
                                />
                              )}
                            </form.Field>
                          </div>

                          {/* Ubicaciones origen / destino (opcionales) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <form.Field
                              name={`transferencia_detalle[${index}].ubicacion_origen`}
                            >
                              {(field) => (
                                <LocationSelectField
                                  label="Ubicación Origen (opcional)"
                                  field={field}
                                  almacenId={almacenOrigen}
                                  noWarehouseLabel="Selecciona almacén origen primero"
                                  options={originLocationOptions}
                                  getError={getError}
                                  errorPath={`transferencia_detalle.${index}.ubicacion_origen`}
                                  onChangeExtra={() =>
                                    clearError(
                                      `transferencia_detalle.${index}.ubicacion_origen`,
                                    )
                                  }
                                />
                              )}
                            </form.Field>

                            <form.Field
                              name={`transferencia_detalle[${index}].ubicacion_destino`}
                            >
                              {(field) => (
                                <LocationSelectField
                                  label="Ubicación Destino (opcional)"
                                  field={field}
                                  almacenId={almacenDestino}
                                  noWarehouseLabel="Selecciona almacén destino primero"
                                  options={destinationLocationOptions}
                                  getError={getError}
                                  errorPath={`transferencia_detalle.${index}.ubicacion_destino`}
                                  onChangeExtra={() =>
                                    clearError(
                                      `transferencia_detalle.${index}.ubicacion_destino`,
                                    )
                                  }
                                />
                              )}
                            </form.Field>
                          </div>

                          {/* Error a nivel de línea (no atribuible a un campo) */}
                          {lineFormError && (
                            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                              {lineFormError.message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </form.Field>
            </div>
          </section>

          {/* ── Sección: Observaciones ─────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-500/5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <InfoIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Observaciones
                </h3>
                <p className="text-[11px] text-slate-500">Notas del traspaso (opcional)</p>
              </div>
            </div>
            <div className="p-6">
              <form.Field name="observaciones">
                {(field) => (
                  <FormTextarea
                    label="Observaciones (opcional)"
                    placeholder="Motivo o notas del traspaso"
                    rows={2}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("observaciones");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("observaciones")}
                  />
                )}
              </form.Field>
            </div>
          </section>
        </fieldset>

        {/* ── Botones de acción ──────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Registrando...">
            Registrar traspaso
          </FormSubmitButton>
        </div>
      </form>

      {/* Selector de producto/variante apilado ENCIMA del formulario, que
          permanece montado detrás para no perder el estado de las demás líneas. */}
      <StockTransferProductSelectorDialog
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        mode={picker?.mode ?? "producto"}
        productOptions={productOptions}
        variantOptions={variantOptions}
        selectedId={
          picker === null
            ? 0
            : picker.mode === "producto"
              ? form.getFieldValue(`transferencia_detalle[${picker.index}].producto`)
              : form.getFieldValue(
                  `transferencia_detalle[${picker.index}].producto_variante`,
                )
        }
        onSelect={(id) => {
          if (picker === null) return;
          // Se escribe en la línea CONCRETA que abrió el selector, respetando el
          // XOR (solo se toca el campo del modo activo; el otro ya está en 0).
          if (picker.mode === "producto") {
            form.setFieldValue(`transferencia_detalle[${picker.index}].producto`, id);
            clearError(`transferencia_detalle.${picker.index}.producto`);
          } else {
            form.setFieldValue(
              `transferencia_detalle[${picker.index}].producto_variante`,
              id,
            );
            clearError(`transferencia_detalle.${picker.index}.producto_variante`);
          }
          setPicker(null);
        }}
      />
    </>
  );
}

/**
 * Punto de entrada: botón que abre el diálogo de captura de traspaso. El
 * contenido (y con él los catálogos) solo se monta cuando el modal se abre.
 */
export const StockTransferForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nuevo Traspaso"
          subtitle="Traslada existencias de un almacén a otro"
          statusColor="sky"
        />
      }
      maxWidth="900px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <TraspasosIcon className="w-4 h-4" />
          Nuevo traspaso
        </Button>
      }
    >
      {isDialogOpen && <StockTransferFormContent onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
