"use client";

import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { ExclamationTriangleIcon, RejectIcon } from "@/src/components/Icons";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { useSupplierInvoiceEditForm } from "../hooks/useSupplierInvoiceEditForm";

interface SupplierInvoiceEditFormProps {
  factura: FacturaProveedor;
  onSuccess?: () => void;
}

/**
 * Edición de cabecera de una factura de proveedor en `Borrador`.
 *
 * Quien lo monte (el listado, en la parte 2) debe ofrecerlo SOLO sobre
 * borradores; si llega otra cosa se muestra un aviso en vez del formulario, para
 * no enviar un PATCH que el backend rechazaría (una factura registrada con CxP
 * viva no puede volver a borrador).
 */
export default function SupplierInvoiceEditForm({
  factura,
  onSuccess,
}: SupplierInvoiceEditFormProps) {
  const {
    form,
    formRef,
    isPending,
    serverBanner,
    dismissBanner,
    getError,
    clearError,
    submitAs,
    handleFormSubmit,
  } = useSupplierInvoiceEditForm({ factura, onSuccess });

  const objetivo = useStore(form.store, (state) => state.values.estatus_objetivo);

  if (factura.estatus !== "Borrador") {
    return (
      <p className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        Solo se puede editar una factura en borrador. Esta factura está {factura.estatus.toLowerCase()}.
      </p>
    );
  }

  const moneda = factura.moneda_codigo ? { currency: factura.moneda_codigo } : undefined;

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-6">
        {serverBanner && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3"
          >
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="flex-1 text-sm text-red-700 dark:text-red-300">{serverBanner}</p>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Descartar aviso"
              className="p-1 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <RejectIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Datos fijos: salen de los renglones del alta y ya no cambian. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs">
          <div>
            <p className="text-slate-400">Proveedor</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {factura.proveedor_nombre ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Partidas</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {factura.factura_proveedor_detalles.length}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Moneda</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {factura.moneda_codigo ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Total</p>
            <p className="font-semibold tabular-nums text-slate-800 dark:text-white">
              {formatMoneyValueOrDash(factura.total, moneda)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form.Field name="folio">
            {(field) => (
              <FormInput
                label="Folio"
                forceUppercase
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearError("folio");
                }}
                error={getError("folio")}
              />
            )}
          </form.Field>
          <form.Field name="fecha_vencimiento">
            {(field) => (
              <FormInput
                label="Fecha de vencimiento"
                type="date"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearError("fecha_vencimiento");
                }}
                error={getError("fecha_vencimiento")}
              />
            )}
          </form.Field>
          <div className="md:col-span-2">
            <form.Field name="observaciones">
              {(field) => (
                <FormTextarea
                  label="Observaciones"
                  rows={2}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearError("observaciones");
                  }}
                  error={getError("observaciones")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <p className="max-w-xl text-right text-xs text-slate-500 dark:text-slate-400">
            Registrar genera la cuenta por pagar con el total de esta factura y congela sus
            importes: después ya no podrá cambiar el total, el proveedor ni la moneda, ni
            volver a borrador.
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <FormSubmitButton
              type="button"
              onClick={() => submitAs("Borrador")}
              isPending={isPending && objetivo === "Borrador"}
              loadingLabel="Guardando..."
              className="bg-slate-600! hover:bg-slate-700! focus:ring-slate-500!"
            >
              Guardar cambios
            </FormSubmitButton>
            <FormSubmitButton
              type="button"
              onClick={() => submitAs("Registrada")}
              isPending={isPending && objetivo === "Registrada"}
              loadingLabel="Registrando..."
              className="bg-amber-600! hover:bg-amber-700! focus:ring-amber-500!"
            >
              Registrar y generar cuenta por pagar
            </FormSubmitButton>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
