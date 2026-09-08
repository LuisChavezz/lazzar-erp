"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import {
  InfoIcon,
  NotaCreditoIcon,
  PlusIcon,
  RejectIcon,
  DeleteIcon,
} from "@/src/components/Icons";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import {
  centavosAMoneda,
  sumTotalesDeLineasEnCentavos,
} from "../schemas/credit-note.schema";
import { useCreditNoteForm } from "../hooks/useCreditNoteForm";
import { InvoiceSelectorDialog } from "./InvoiceSelectorDialog";
import { InvoiceLinesSelectorDialog } from "./InvoiceLinesSelectorDialog";

interface CreditNoteFormProps {
  onSuccess: () => void;
}

/** Campos de importe de una línea, para pintarlos sin repetir el mismo bloque. */
const LINE_MONEY_FIELDS = [
  { key: "cantidad", label: "Cantidad" },
  { key: "precio_unitario", label: "Precio unitario" },
  { key: "impuesto", label: "Impuesto" },
  { key: "subtotal", label: "Subtotal" },
  { key: "total", label: "Total" },
] as const;

export default function CreditNoteForm({ onSuccess }: CreditNoteFormProps) {
  const {
    form,
    isPending,
    lineKeys,
    serverBanner,
    dismissBanner,
    getError,
    clearError,
    handleFacturaChange,
    addLines,
    removeLine,
    submitAs,
    handleFormSubmit,
    handleReset,
  } = useCreditNoteForm({ onSuccess });

  const [isInvoicePickerOpen, setIsInvoicePickerOpen] = useState(false);
  const [isLinesPickerOpen, setIsLinesPickerOpen] = useState(false);

  // ── Suscripciones reactivas ──────────────────────────────────────────────
  const factura = useStore(form.store, (state) => state.values.factura);
  const facturaFolio = useStore(form.store, (state) => state.values.factura_folio);
  const monedaCodigo = useStore(form.store, (state) => state.values.moneda_codigo);
  const cxcSaldo = useStore(form.store, (state) => state.values.cxc_saldo);
  const lines = useStore(form.store, (state) => state.values.nota_credito_detalles);
  // Con qué estatus se está enviando: lo fija `submitAs` justo antes del envío,
  // así que sirve para poner la etiqueta de pendiente en el botón correcto.
  const estatusIntent = useStore(form.store, (state) => state.values.estatus);

  const monedaFormato = monedaCodigo ? { currency: monedaCodigo } : undefined;
  const selectedDetalleIds = lines.map((line) => line.factura_detalle);

  // Suma de los conceptos desglosados. Es SOLO INFORMATIVA: no alimenta ningún
  // campo del payload. El importe que se acredita es el `total` capturado abajo
  // —el backend aplica ese valor a la cuenta por cobrar sin mirar las líneas—,
  // así que esta suma existe para que el usuario vea si el desglose cuadra con
  // lo que escribió, no para imponerlo.
  const sumaLineas = centavosAMoneda(sumTotalesDeLineasEnCentavos(lines));

  return (
    <>
      <form onSubmit={handleFormSubmit} className="w-full">
        <fieldset disabled={isPending}>
          {/* Banner de "todo o nada": el alta es atómica, así que ante un error
              del backend NADA quedó registrado — ni el documento, ni el saldo de
              la cuenta por cobrar si la nota iba a emitirse. */}
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

          {/* ── Factura a acreditar ─────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <NotaCreditoIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Factura a Acreditar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Solo facturas con saldo por cobrar
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                onClick={() => setIsInvoicePickerOpen(true)}
              >
                {factura > 0 ? "Cambiar factura" : "Elegir factura"}
              </Button>
            </div>

            <div className="px-8 py-6">
              {factura > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Factura</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-white truncate">
                      {facturaFolio || `Factura #${factura}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Saldo por cobrar
                    </p>
                    <p className="text-base font-bold tabular-nums text-slate-800 dark:text-white">
                      {formatMoneyValueOrDash(cxcSaldo, monedaFormato)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">
                  Ninguna factura seleccionada.
                </p>
              )}
              {getError("factura") && (
                <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("factura")?.message}
                </p>
              )}
              {/* `cliente` NO se captura: se deriva de la factura. Si el backend
                  lo rechaza (no coincide con el de la factura), el mensaje se
                  pinta aquí, junto a lo que sí lo determina. */}
              {getError("cliente") && (
                <p className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("cliente")?.message}
                </p>
              )}
            </div>
          </section>

          {/* ── Datos del documento ─────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos de la Nota
              </h3>
              <p className="text-xs text-slate-500">
                El total es el importe que se acreditará al saldo de la factura
              </p>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <form.Field name="folio">
                {(field) => (
                  // El backend NO autogenera folio: no hay serie detrás de este
                  // documento, así que se captura y queda `null` si se omite.
                  <FormInput
                    label="Folio"
                    placeholder="Folio del documento (opcional)"
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

              <form.Field name="motivo">
                {(field) => (
                  <FormInput
                    label="Motivo"
                    placeholder="Ej. Devolución de mercancía (opcional)"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("motivo");
                    }}
                    error={getError("motivo")}
                  />
                )}
              </form.Field>

              {/* `subtotal` e `impuestos` son INFORMATIVOS: el backend los guarda
                  pero no los usa para nada, y no se validan contra `total` ni
                  entre sí porque el modelo no relaciona los tres. */}
              <form.Field name="subtotal">
                {(field) => (
                  <FormInput
                    label="Subtotal"
                    inputMode="decimal"
                    placeholder="0.00"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                      clearError("subtotal");
                    }}
                    error={getError("subtotal")}
                  />
                )}
              </form.Field>

              <form.Field name="impuestos">
                {(field) => (
                  <FormInput
                    label="Impuestos"
                    inputMode="decimal"
                    placeholder="0.00"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                      clearError("impuestos");
                    }}
                    error={getError("impuestos")}
                  />
                )}
              </form.Field>

              <div className="md:col-span-2">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      rows={2}
                      placeholder="Notas internas de la nota (opcional)"
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

          {/* ── Conceptos acreditados ───────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Conceptos acreditados{" "}
                  <span className="text-sm font-normal text-slate-400">(opcional)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {factura > 0
                    ? "Desglose documental: describe QUÉ se acredita. El importe lo fija el total de la nota."
                    : "Selecciona primero una factura"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                disabled={factura <= 0}
                onClick={() => setIsLinesPickerOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Agregar conceptos
                </span>
              </Button>
            </div>

            <div className="p-8">
              {/* Error a nivel del arreglo (p. ej. conceptos repetidos). */}
              {getError("nota_credito_detalles") && (
                <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("nota_credito_detalles")?.message}
                </p>
              )}

              <form.Field name="nota_credito_detalles" mode="array">
                {(arrayField) =>
                  arrayField.state.value.length === 0 ? (
                    // Sin líneas es un documento VÁLIDO: el backend no exige
                    // ninguna y el crédito lo determina el total.
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-8">
                      Sin conceptos desglosados. La nota puede emitirse así.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {arrayField.state.value.map((line, index) => {
                        const lineFormError = getError(
                          `nota_credito_detalles.${index}._form`,
                        );
                        return (
                          <div
                            key={lineKeys[index] ?? index}
                            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 text-xs font-bold text-violet-700 dark:text-violet-300">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                    {line.producto_nombre}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Facturado:{" "}
                                    {formatQuantityValue(line.cantidad_facturada)} ·{" "}
                                    {formatMoneyValueOrDash(
                                      line.total_facturado,
                                      monedaFormato,
                                    )}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                aria-label={`Quitar ${line.producto_nombre}`}
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

                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                              {LINE_MONEY_FIELDS.map(({ key, label }) => (
                                <form.Field
                                  key={key}
                                  name={`nota_credito_detalles[${index}].${key}`}
                                >
                                  {(field) => (
                                    <FormInput
                                      label={label}
                                      inputMode="decimal"
                                      placeholder="0.00"
                                      name={field.name}
                                      value={field.state.value}
                                      onChange={(event) => {
                                        field.handleChange(
                                          sanitizeDecimalInput(event.target.value, 2),
                                        );
                                        clearError(
                                          `nota_credito_detalles.${index}.${key}`,
                                        );
                                      }}
                                      error={getError(
                                        `nota_credito_detalles.${index}.${key}`,
                                      )}
                                    />
                                  )}
                                </form.Field>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Suma informativa del desglose. NO es el importe que se
                          acredita — ese es el `total` capturado abajo. Se muestra
                          para que el usuario note si el desglose y el total no
                          coinciden, pero nada le impide dejarlos distintos: el
                          backend tampoco lo impide. */}
                      <div className="flex items-center justify-end gap-3 pt-2 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">
                          Suma de los conceptos
                        </span>
                        <span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                          {formatMoneyValueOrDash(sumaLineas, monedaFormato)}
                        </span>
                      </div>
                    </div>
                  )
                }
              </form.Field>
            </div>
          </section>

          {/* ── Total de la nota ────────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-violet-200 dark:border-violet-500/20 overflow-hidden mb-6">
            <div className="p-8">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    Total de la nota
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Es el importe que se descontará del saldo por cobrar de la factura
                    al emitir. Se captura: no se calcula a partir de los conceptos.
                  </p>
                </div>
                <div className="w-full sm:w-56">
                  <form.Field name="total">
                    {(field) => (
                      <FormInput
                        label="Total"
                        inputMode="decimal"
                        placeholder="0.00"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(
                            sanitizeDecimalInput(event.target.value, 2),
                          );
                          clearError("total");
                        }}
                        error={getError("total")}
                      />
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
            <FormCancelButton onClick={handleReset} disabled={isPending} />
            {/* Dos salidas explícitas. Guardar como borrador NO toca la cuenta
                por cobrar; emitir aplica el crédito de inmediato. El `fieldset`
                de arriba deshabilita ambos mientras hay un envío en vuelo, así
                que la etiqueta de pendiente solo hace falta en el que se pulsó. */}
            <FormSubmitButton
              type="button"
              onClick={() => submitAs("Borrador")}
              isPending={isPending && estatusIntent === "Borrador"}
              loadingLabel="Guardando..."
              className="bg-slate-600! hover:bg-slate-700! focus:ring-slate-500!"
            >
              Guardar borrador
            </FormSubmitButton>
            <FormSubmitButton
              type="button"
              onClick={() => submitAs("Emitida")}
              isPending={isPending && estatusIntent === "Emitida"}
              loadingLabel="Emitiendo..."
              className="bg-amber-600! hover:bg-amber-700! focus:ring-amber-500!"
            >
              Emitir nota
            </FormSubmitButton>
          </div>
        </fieldset>
      </form>

      {/* Selectores apilados ENCIMA del formulario, que permanece montado detrás
          para no perder lo capturado. */}
      <InvoiceSelectorDialog
        open={isInvoicePickerOpen}
        onOpenChange={setIsInvoicePickerOpen}
        selectedFacturaId={factura}
        onConfirm={handleFacturaChange}
      />

      <InvoiceLinesSelectorDialog
        open={isLinesPickerOpen}
        onOpenChange={setIsLinesPickerOpen}
        facturaId={factura}
        monedaCodigo={monedaCodigo}
        alreadySelectedIds={selectedDetalleIds}
        onConfirm={addLines}
      />
    </>
  );
}
