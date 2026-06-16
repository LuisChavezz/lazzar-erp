"use client";

import {
  FormCancelButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PackageCheckIcon } from "@/src/components/Icons";
import { useReceiptForm } from "../hooks/useReceiptForm";
import type { ReceiptOnboardingPurchaseOrder } from "../interfaces/receipt-onboarding.interface";

interface ReceiptFormProps {
  onSuccess: () => void;
  purchaseOrder: ReceiptOnboardingPurchaseOrder;
}

export default function ReceiptForm({
  onSuccess,
  purchaseOrder,
}: ReceiptFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    warehouses,
    purchaseOrder: po,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useReceiptForm({ onSuccess, purchaseOrder });

  return (
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleFormSubmit}
      className="w-full"
    >
      <fieldset
        disabled={isPending}
        className="group-disabled:opacity-50"
      >
        {/* ── Datos de recepción ─────────────────────────────────────── */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <PackageCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos de Recepción
              </h3>
              <p className="text-xs text-slate-500">
                Orden: {po.folio} — {po.proveedor_nombre}
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Almacén */}
              <form.Field name="almacen">
                {(field) => (
                  <FormSelect
                    label="Almacén"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      field.handleChange(
                        Number.isNaN(next) ? 0 : next,
                      );
                      clearFieldErrors("almacen");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("almacen", field.state.value);
                    }}
                    error={getError("almacen")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {warehouses.map((w) => (
                      <option
                        key={w.id_almacen}
                        value={w.id_almacen}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {w.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              {/* Remisión */}
              <form.Field name="remision">
                {(field) => (
                  <FormInput
                    label="Remisión"
                    placeholder="Número de remisión"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("remision");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("remision", field.state.value);
                    }}
                    error={getError("remision")}
                  />
                )}
              </form.Field>

              {/* Factura de referencia */}
              <form.Field name="factura_referencia">
                {(field) => (
                  <FormInput
                    label="Factura de Referencia"
                    placeholder="Folio de la factura"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("factura_referencia");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField(
                        "factura_referencia",
                        field.state.value,
                      );
                    }}
                    error={getError("factura_referencia")}
                  />
                )}
              </form.Field>

              {/* Serie de recepción — segmented control */}
              <form.Field name="serie_codigo">
                {(field) => {
                  const options = ["RC", "RT", "RZ"] as const;
                  return (
                    <div className="group/field w-full">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
                        Serie de Recepción
                      </label>
                      <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                        {options.map((opt, i) => {
                          const isSelected = field.state.value === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const next = isSelected ? "" : opt;
                                field.handleChange(next);
                                clearFieldErrors("serie_codigo");
                                field.handleBlur();
                                validateField("serie_codigo", next);
                              }}
                              className={`px-5 py-2 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                                i < options.length - 1
                                  ? "border-r border-slate-300 dark:border-slate-600"
                                  : ""
                              } ${
                                isSelected
                                  ? "bg-sky-600 text-white shadow-inner"
                                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {getError("serie_codigo") && (
                        <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
                          {getError("serie_codigo")?.message}
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>

              {/* Observaciones */}
              <div className="md:col-span-2">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      rows={3}
                      placeholder="Notas adicionales sobre la recepción"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("observaciones");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField(
                          "observaciones",
                          field.state.value,
                        );
                      }}
                      error={getError("observaciones")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        {/* ── Detalle de la OC ──────────────────────────────────────── */}
        {po.detalle.length > 0 && (
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
            <div className="px-8 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <PackageCheckIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                  Detalle de Productos
                </h3>
                <p className="text-xs text-slate-500">
                  {po.detalle.length} producto{po.detalle.length > 1 ? "s" : ""} — Capturar cantidad recibida
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {po.detalle.map((d) => {
                  const fieldName = `cantidades.${d.id}` as const;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-4 py-3 px-2"
                    >
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {d.producto_nombre}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ordenado: {d.cantidad_ordenada} &middot; Pendiente: {d.cantidad_pendiente}
                        </p>
                      </div>

                      {/* Cantidad recibida */}
                      <form.Field name={fieldName}>
                        {(field) => (
                          <QuantitySelector
                            value={Number(field.state.value) || 0}
                            onChange={(next) =>
                              field.handleChange(String(next))
                            }
                            min={0}
                            label={`Cantidad de ${d.producto_nombre}`}
                          />
                        )}
                      </form.Field>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Botones ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pb-8 mt-8 sm:flex-row sm:items-center sm:justify-end">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Registrando..."
          >
            Registrar Recepción
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
