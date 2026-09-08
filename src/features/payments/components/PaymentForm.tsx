"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import { Loader } from "@/src/components/Loader";
import {
  InfoIcon,
  PlusIcon,
  ReceiptIcon,
  RejectIcon,
  DeleteIcon,
} from "@/src/components/Icons";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { METODO_PAGO_OPTIONS } from "../constants/paymentStatus";
import {
  centavosAMoneda,
  monedaDelPago,
  sumImportesEnCentavos,
} from "../schemas/payment.schema";
import { usePaymentForm } from "../hooks/usePaymentForm";
import { CxpSelectorDialog } from "./CxpSelectorDialog";

interface PaymentFormProps {
  onSuccess: () => void;
}

export default function PaymentForm({ onSuccess }: PaymentFormProps) {
  const {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    supplierOptions,
    bankAccountOptions,
    lineKeys,
    serverBanner,
    dismissBanner,
    getError,
    clearError,
    addLines,
    removeLine,
    handleProveedorChange,
    handleFormSubmit,
    handleReset,
  } = usePaymentForm({ onSuccess });

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // ── Suscripciones reactivas ──────────────────────────────────────────────
  const proveedor = useStore(form.store, (state) => state.values.proveedor);
  const lines = useStore(form.store, (state) => state.values.pago_detalles);

  // El total es DERIVADO de las líneas — no un campo que el usuario capture —,
  // usando la misma suma en centavos que `buildPagoPayload`, así que lo que se
  // muestra aquí y lo que viaja como `total_pagado` no pueden discrepar.
  const totalCents = sumImportesEnCentavos(lines);
  // Candado de moneda: `undefined` = sin líneas (sin candado); `string | null` =
  // moneda ya fijada. `null` es un valor de candado legítimo, NO "sin candado" —
  // ver `monedaDelPago`, que es la definición única que comparten esta vista, el
  // filtro del selector y el `superRefine` del schema.
  const monedaCodigo = monedaDelPago(lines);
  // Para formatear solo sirve un código ISO real; con `null`/`undefined` se cae al
  // formato sin símbolo en vez de fingir MXN.
  const monedaFormato =
    typeof monedaCodigo === "string" ? { currency: monedaCodigo } : undefined;
  const selectedCxpIds = lines.map((line) => line.cxp);

  if (isLoadingFormData) {
    return (
      <Loader
        className="py-12"
        title="Cargando datos"
        message="Cargando proveedores y cuentas bancarias..."
      />
    );
  }

  // Un catálogo caído NO se pinta como catálogo vacío: se distingue el error de
  // red de la ausencia legítima de datos. Mismo criterio que el alta de traspaso.
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
              Para registrar un pago primero se necesita:
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

  return (
    <>
      <form onSubmit={handleFormSubmit} className="w-full">
        <fieldset disabled={isPending}>
          {/* Banner de "todo o nada": el alta es atómica, así que ante un error
              del backend NADA quedó registrado. */}
          {serverBanner && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3">
              <InfoIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
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

          {/* ── Cabecera ────────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <ReceiptIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Datos del Pago
                </h3>
                <p className="text-xs text-slate-500">
                  Proveedor, cuenta de origen y referencia bancaria
                </p>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <form.Field name="cuenta_bancaria">
                {(field) => (
                  <FormSelect
                    label="Cuenta bancaria de origen"
                    name={field.name}
                    value={String(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(Number(event.target.value));
                      clearError("cuenta_bancaria");
                    }}
                    error={getError("cuenta_bancaria")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {bankAccountOptions.map((option) => (
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

              <form.Field name="fecha_pago">
                {(field) => (
                  // Opcional: si se deja vacía, `buildPagoPayload` OMITE la llave
                  // y el backend aplica su default (hoy). Nunca se manda `null`:
                  // el campo no es nullable.
                  <FormInput
                    label="Fecha de pago"
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("fecha_pago");
                    }}
                    error={getError("fecha_pago")}
                  />
                )}
              </form.Field>

              <form.Field name="metodo_pago">
                {(field) => (
                  <FormSelect
                    label="Método de pago"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(
                        event.target.value as (typeof METODO_PAGO_OPTIONS)[number]["value"],
                      );
                      clearError("metodo_pago");
                    }}
                    error={getError("metodo_pago")}
                  >
                    {METODO_PAGO_OPTIONS.map((option) => (
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

              {/* `forceUppercase` en ambas referencias: son texto corto
                  alfanumérico, la misma clase de campo que `numero_cliente` o
                  `convenio`. JUICIO: si alguna vez se concilian contra el estado
                  de cuenta comparando carácter a carácter y el banco distingue
                  mayúsculas, esta normalización sería lossy y habría que
                  quitarla — hoy no hay conciliación automática que lo exija. */}
              <form.Field name="referencia">
                {(field) => (
                  <FormInput
                    label="Referencia"
                    placeholder="Ej. SPEI 1234 (opcional)"
                    forceUppercase
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("referencia");
                    }}
                    error={getError("referencia")}
                  />
                )}
              </form.Field>

              <form.Field name="referencia_operacion">
                {(field) => (
                  <FormInput
                    label="Referencia de operación"
                    placeholder="Folio del banco (opcional)"
                    forceUppercase
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("referencia_operacion");
                    }}
                    error={getError("referencia_operacion")}
                  />
                )}
              </form.Field>

              <div className="md:col-span-2">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      rows={2}
                      placeholder="Notas internas del pago (opcional)"
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
          </section>

          {/* ── Líneas: CxP aplicadas ───────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Cuentas por Pagar aplicadas
                </h3>
                <p className="text-xs text-slate-500">
                  {proveedor > 0
                    ? "Elige las facturas que cubre este pago y cuánto se aplica a cada una"
                    : "Selecciona primero un proveedor"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                disabled={proveedor <= 0}
                onClick={() => setIsPickerOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Agregar cuentas
                </span>
              </Button>
            </div>

            <div className="p-8">
              {/* Error a nivel del arreglo (p. ej. "Agrega al menos una cuenta"). */}
              {getError("pago_detalles") && (
                <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("pago_detalles")?.message}
                </p>
              )}

              <form.Field name="pago_detalles" mode="array">
                {(arrayField) =>
                  arrayField.state.value.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-8">
                      Sin cuentas por pagar seleccionadas.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {arrayField.state.value.map((line, index) => {
                        const lineFormError = getError(`pago_detalles.${index}._form`);
                        return (
                          <div
                            key={lineKeys[index] ?? index}
                            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                    {line.factura_folio}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Saldo{" "}
                                    {formatMoneyValueOrDash(
                                      line.saldo,
                                      line.moneda_codigo
                                        ? { currency: line.moneda_codigo }
                                        : undefined,
                                    )}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                aria-label={`Quitar ${line.factura_folio}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <DeleteIcon className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>

                            {lineFormError && (
                              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                                {lineFormError.message}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <form.Field
                                name={`pago_detalles[${index}].importe_aplicado`}
                              >
                                {(field) => (
                                  <FormInput
                                    label="Importe a aplicar"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      // Dinero: se sanea a 2 decimales con el
                                      // helper compartido. NO se clampa al saldo
                                      // al teclear —eso impediría corregir un
                                      // número a medio escribir—; el techo lo
                                      // valida el `superRefine` de la línea y lo
                                      // reconfirma el backend.
                                      field.handleChange(
                                        sanitizeDecimalInput(event.target.value, 2),
                                      );
                                      clearError(
                                        `pago_detalles.${index}.importe_aplicado`,
                                      );
                                    }}
                                    error={getError(
                                      `pago_detalles.${index}.importe_aplicado`,
                                    )}
                                  />
                                )}
                              </form.Field>

                              <form.Field name={`pago_detalles[${index}].observaciones`}>
                                {(field) => (
                                  <FormInput
                                    label="Observaciones de la línea"
                                    placeholder="Opcional"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(event.target.value);
                                      clearError(
                                        `pago_detalles.${index}.observaciones`,
                                      );
                                    }}
                                    error={getError(
                                      `pago_detalles.${index}.observaciones`,
                                    )}
                                  />
                                )}
                              </form.Field>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </form.Field>

              {/* Total derivado. No es un campo editable: es la suma de las
                  líneas y es exactamente lo que viaja como `total_pagado`. La
                  llave sirve además de destino para el error de cuadre que el
                  backend reporta en `total_pagado`. */}
              <div className="mt-6 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total del pago
                </span>
                <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
                  {formatMoneyValueOrDash(centavosAMoneda(totalCents), monedaFormato)}
                </span>
              </div>
              {getError("total_pagado") && (
                <p className="mt-2 text-right text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("total_pagado")?.message}
                </p>
              )}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pb-4">
            <FormCancelButton onClick={handleReset} disabled={isPending} />
            <FormSubmitButton isPending={isPending} loadingLabel="Registrando...">
              Registrar pago
            </FormSubmitButton>
          </div>
        </fieldset>
      </form>

      {/* Selector apilado ENCIMA del formulario, que permanece montado detrás
          para no perder el estado de las demás líneas. */}
      <CxpSelectorDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        proveedorId={proveedor > 0 ? proveedor : null}
        alreadySelectedIds={selectedCxpIds}
        monedaCodigo={monedaCodigo}
        onConfirm={addLines}
      />
    </>
  );
}
