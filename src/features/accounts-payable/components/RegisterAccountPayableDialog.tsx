"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { Loader } from "@/src/components/Loader";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { CxpIcon, InfoIcon, RefreshIcon, RejectIcon } from "@/src/components/Icons";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { useAccountPayableForm } from "../hooks/useAccountPayableForm";
import { moneyFormatFor } from "../utils/accounts-payable.utils";
import { FacturaProveedorSelectorDialog } from "./FacturaProveedorSelectorDialog";

function RegisterAccountPayableForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    form,
    formRef,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    supplierOptions,
    serverError,
    dismissServerError,
    retrySubmit,
    getError,
    clearErrors,
    handleProveedorChange,
    handleFacturaChange,
    handleFormSubmit,
    handleReset,
  } = useAccountPayableForm({ onSuccess });

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // ── Suscripciones reactivas ──────────────────────────────────────────────
  const proveedor = useStore(form.store, (state) => state.values.proveedor);
  const facturaId = useStore(form.store, (state) => state.values.factura_proveedor);
  const facturaFolio = useStore(
    form.store,
    (state) => state.values.factura_proveedor_folio,
  );
  const total = useStore(form.store, (state) => state.values.total);
  const monedaCodigo = useStore(form.store, (state) => state.values.moneda_codigo);

  const openPicker = () => {
    if (proveedor > 0) setIsPickerOpen(true);
  };

  if (isLoadingFormData) {
    return (
      <Loader className="py-12" title="Cargando datos" message="Cargando proveedores..." />
    );
  }

  // Un catálogo caído NO se pinta como catálogo vacío.
  if (isErrorFormData) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudo cargar el catálogo de proveedores
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Revisa tu conexión e intenta abrir el diálogo de nuevo.
        </p>
      </div>
    );
  }

  if (missingItems.length > 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <InfoIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Faltan configuraciones
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Para registrar una cuenta por pagar primero se necesita:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
              {missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Si el aviso de "Selecciona la factura" ya está bajo la factura, no se repite
  // bajo el total: los dos salen de la misma elección.
  const totalError = getError("factura_proveedor") ? undefined : getError("total");

  return (
    <>
      <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
        <fieldset disabled={isPending}>
          {/* Banner del backend. Un 409 es de REINTENTO (ámbar, con botón): nada
              que corregir, otra operación tenía la factura bloqueada. Cualquier
              otro rechazo es rojo y exige corregir antes de reenviar. */}
          {serverError &&
            (serverError.canRetry ? (
              <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <InfoIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="flex-1 min-w-48 text-sm text-amber-800 dark:text-amber-300">
                  {serverError.message}
                </p>
                <Button type="button" variant="secondary" rounded="full" onClick={retrySubmit}>
                  <RefreshIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <InfoIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="flex-1 text-sm text-red-700 dark:text-red-300">
                  {serverError.message}
                </p>
                <button
                  type="button"
                  onClick={dismissServerError}
                  aria-label="Descartar aviso"
                  className="p-1 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <RejectIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}

          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-4">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <CxpIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Factura del Proveedor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Solo facturas registradas que aún no tienen cuenta por pagar
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                disabled={proveedor <= 0}
                onClick={openPicker}
              >
                {facturaId > 0 ? "Cambiar factura" : "Elegir factura"}
              </Button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <form.Field name="proveedor">
                {(field) => (
                  <FormSelect
                    label="Proveedor"
                    name={field.name}
                    value={String(field.state.value)}
                    onChange={(event) => handleProveedorChange(Number(event.target.value))}
                    error={getError("proveedor")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {supplierOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {option.label}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              {/* Solo lectura: la factura se elige con el selector. Tiene `name`
                  para que el scroll al primer error la encuentre. */}
              <FormInput
                label="Factura"
                name="factura_proveedor"
                readOnly
                placeholder={
                  proveedor > 0 ? "Elige una factura..." : "Selecciona primero un proveedor"
                }
                value={facturaId > 0 ? facturaFolio || `Factura #${facturaId}` : ""}
                onClick={openPicker}
                className={proveedor > 0 ? "cursor-pointer" : ""}
                error={getError("factura_proveedor")}
              />

              {/* `total` NO se captura: es el de la factura, y el backend exige
                  que coincidan. */}
              <FormInput
                label="Total de la factura"
                name="total"
                readOnly
                placeholder="Se toma de la factura"
                value={total ? formatMoneyValueOrDash(total, moneyFormatFor(monedaCodigo)) : ""}
                error={totalError}
              />

              <form.Field name="fecha_vencimiento">
                {(field) => (
                  <FormInput
                    label="Fecha de vencimiento"
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearErrors("fecha_vencimiento");
                    }}
                    error={getError("fecha_vencimiento")}
                  />
                )}
              </form.Field>

              <p className="md:col-span-2 -mt-2 text-xs text-slate-500 dark:text-slate-400">
                El vencimiento se precarga con el de la factura. Si lo dejas vacío, la
                cuenta toma el de la factura.
              </p>

              <div className="md:col-span-2">
                <form.Field name="observaciones">
                  {(field) => (
                    // Sin `forceUppercase`: texto libre, igual que las
                    // observaciones del resto de finanzas.
                    <FormTextarea
                      label="Observaciones"
                      rows={2}
                      placeholder="Notas internas de la cuenta (opcional)"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearErrors("observaciones");
                      }}
                      error={getError("observaciones")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          <p className="mb-6 px-1 text-xs text-slate-500 dark:text-slate-400">
            La cuenta nace con saldo igual al total y estatus Pendiente. Su saldo solo
            lo mueven los pagos.
          </p>

          <div className="flex items-center justify-end gap-3 pb-4">
            <FormCancelButton onClick={handleReset} disabled={isPending} />
            <FormSubmitButton isPending={isPending} loadingLabel="Registrando...">
              Registrar cuenta
            </FormSubmitButton>
          </div>
        </fieldset>
      </form>

      {/* Selector apilado ENCIMA del formulario, que permanece montado detrás. */}
      <FacturaProveedorSelectorDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        proveedorId={proveedor}
        selectedFacturaId={facturaId}
        onConfirm={handleFacturaChange}
      />
    </>
  );
}

/**
 * RegisterAccountPayableDialog
 *
 * Alta manual de una cuenta por pagar a partir de una factura de proveedor. Es un
 * flujo de RECUPERACIÓN, no el alta principal: toda factura que llega a
 * `Registrada` genera su CxP sola en el backend, así que el selector solo tiene
 * facturas cuando alguien borró la CxP de una (p. ej. desde esta misma pantalla).
 * Por eso el disparador es un botón secundario con etiqueta de "faltante", no el
 * botón primario de la pantalla — pero sigue visible, porque el caso es real.
 *
 * Vive en el `actionButton` del listado: `DataTable` mantiene su toolbar montado,
 * así que el botón sigue disponible durante la carga y ante un error del listado.
 *
 * El formulario se monta solo mientras el diálogo está abierto: el catálogo de
 * proveedores se pide bajo demanda y cada alta arranca limpia.
 */
export function RegisterAccountPayableDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Registrar CxP faltante"
          subtitle="Para una factura registrada cuya cuenta por pagar se eliminó"
          statusColor="rose"
        />
      }
      open={isOpen}
      onOpenChange={setIsOpen}
      maxWidth="760px"
      trigger={
        <Button
          variant="secondary"
          rounded="full"
          title="Las facturas registradas generan su CxP solas; usa esto solo si a una le falta"
        >
          Registrar CxP faltante
        </Button>
      }
    >
      {isOpen && <RegisterAccountPayableForm onSuccess={() => setIsOpen(false)} />}
    </MainDialog>
  );
}
