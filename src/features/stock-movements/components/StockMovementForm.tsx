"use client";

import { useStore } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import MissingPrerequisites from "@/src/features/products/components/MissingPrerequisites";
import { InventariosIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { useStockMovementForm } from "../hooks/useStockMovementForm";

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
    missingItems,
    warehouseOptions,
    activeLocations,
    variantOptions,
    movimientoTypeOptions,
    availableStock,
    isCheckingStock,
    handleCheckStock,
    resetStockCheck,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleReset,
  } = useStockMovementForm({ onSuccess: onClose });

  // ─── Suscripciones reactivas a campos del formulario ────────────────────
  const tipoMovimiento = useStore(form.store, (state) => state.values.tipo_movimiento);
  const almacenOrigenId = useStore(form.store, (state) => state.values.almacen_origen_id);

  const isAjuste = tipoMovimiento === "AJUSTE";

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
                        // Limpiar observaciones al salir de AJUSTE
                        if (nextValue !== "AJUSTE") {
                          form.setFieldValue("observaciones", "");
                          clearFieldError("observaciones");
                        }
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
                <p className="text-[11px] text-slate-500">Variante y cantidad del movimiento</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Variante de Producto */}
                <form.Field name="producto_variante_id">
                  {(field) => (
                    <div className="space-y-2">
                      <FormSelect
                        label="Variante de Producto"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                          clearFieldError("producto_variante_id");
                          resetStockCheck();
                        }}
                        onBlur={field.handleBlur}
                        error={getError("producto_variante_id")}
                      >
                        <option value="0" disabled>
                          Seleccionar variante...
                        </option>
                        {variantOptions.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </FormSelect>

                      <div className="flex items-center gap-3 flex-nowrap">
                        <button
                          type="button"
                          onClick={handleCheckStock}
                          disabled={almacenOrigenId < 1 || field.state.value < 1 || isCheckingStock}
                          className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold leading-none rounded-lg cursor-pointer border border-sky-200 text-sky-700 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10 transition-colors"
                        >
                          {isCheckingStock ? "Consultando..." : "Consultar existencias"}
                        </button>

                        {availableStock !== null && (
                          <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                            Stock disponible:{" "}
                            <span className="font-bold text-slate-900 dark:text-white">
                              {availableStock.toLocaleString("es-MX")}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </form.Field>

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

          {/* ── Sección: Notas (solo para AJUSTE) ─────────────────────── */}
          {isAjuste && (
            <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-amber-50/50 dark:bg-amber-500/5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                  <InventariosIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Notas
                  </h3>
                  <p className="text-[11px] text-slate-500">Observaciones obligatorias para el ajuste</p>
                </div>
              </div>

              <div className="p-6">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormInput
                      label="Observaciones"
                      placeholder="Motivo del ajuste"
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
              </div>
            </section>
          )}
        </fieldset>

        {/* ── Botones de acción ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending}>
            Registrar movimiento
          </FormSubmitButton>
        </div>
      </form>
    </>
  );
}

// ─── Componente público ──────────────────────────────────────────────────────

/**
 * Punto de entrada para la tabla.
 * Solo activa la carga de datos del formulario cuando el modal se abre.
 */
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
        <Button>
          <InventariosIcon className="w-4 h-4" />
          Nuevo movimiento
        </Button>
      }
    >
      {isDialogOpen && <StockMovementFormContent onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
