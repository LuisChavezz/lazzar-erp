"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import {
  FormCancelButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { PackageCheckIcon } from "@/src/components/Icons";
import { useReceiptForm } from "../hooks/useReceiptForm";
import type { PurchaseOrder } from "../../purchase-orders/interfaces/purchase-order.interface";

interface ReceiptFormProps {
  onSuccess: () => void;
  purchaseOrder: PurchaseOrder;
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
    suppliers,
    warehouses,
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
                Orden: {purchaseOrder.folio}
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

              {/* Transportista */}
              <form.Field name="transportista">
                {(field) => (
                  <FormInput
                    label="Transportista"
                    placeholder="Nombre del transportista"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("transportista");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("transportista", field.state.value);
                    }}
                    error={getError("transportista")}
                  />
                )}
              </form.Field>

              {/* Proveedor */}
              <form.Field name="proveedor">
                {(field) => (
                  <FormSelect
                    label="Proveedor"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      field.handleChange(
                        Number.isNaN(next) ? 0 : next,
                      );
                      clearFieldErrors("proveedor");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("proveedor", field.state.value);
                    }}
                    error={getError("proveedor")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {suppliers.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {s.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

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
