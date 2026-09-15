"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import {
  DeleteIcon,
  ExclamationTriangleIcon,
  FacturacionIcon,
  InfoIcon,
  PlusIcon,
  RejectIcon,
} from "@/src/components/Icons";
import {
  formatExactQuantityValue,
  formatMoneyValueOrDash,
} from "@/src/utils/formatCurrency";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import {
  DESCUENTO_MANUAL_AVISO,
  calcularImportesLinea,
  calcularTotales,
  centavosAMoneda,
} from "../schemas/supplier-invoice.schema";
import { useSupplierInvoiceForm } from "../hooks/useSupplierInvoiceForm";
import { PurchaseOrderSelectorDialog } from "./PurchaseOrderSelectorDialog";
import { ReceptionSelectorDialog } from "./ReceptionSelectorDialog";
import { ReceptionLinesSelectorDialog } from "./ReceptionLinesSelectorDialog";

interface SupplierInvoiceFormProps {
  onSuccess?: () => void;
}

/** Copy único de lo que implica registrar, pintado junto a los botones de envío. */
const REGISTRAR_AVISO =
  "Registrar genera la cuenta por pagar con el total de esta factura y congela sus importes: después ya no podrá cambiar el total, el proveedor ni la moneda, ni volver a borrador.";

export default function SupplierInvoiceForm({ onSuccess }: SupplierInvoiceFormProps) {
  const {
    form,
    formRef,
    isPending,
    lineKeys,
    serverBanner,
    bannerErrorTick,
    dismissBanner,
    getError,
    clearError,
    handleOcChange,
    handleRecepcionChange,
    addLines,
    removeLine,
    submitAs,
    handleFormSubmit,
    handleReset,
  } = useSupplierInvoiceForm({ onSuccess });

  const [isOcPickerOpen, setIsOcPickerOpen] = useState(false);
  const [isRecepcionPickerOpen, setIsRecepcionPickerOpen] = useState(false);
  const [isLinesPickerOpen, setIsLinesPickerOpen] = useState(false);

  // Mismo recurso que `PolizaForm`: el banner vive arriba y el usuario puede
  // estar desplazado en las partidas cuando llega el rechazo.
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bannerErrorTick > 0) {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bannerErrorTick]);

  // ── Suscripciones reactivas ──────────────────────────────────────────────
  const oc = useStore(form.store, (state) => state.values.oc);
  const ocFolio = useStore(form.store, (state) => state.values.oc_folio);
  const recepcion = useStore(form.store, (state) => state.values.recepcion);
  const recepcionFolio = useStore(form.store, (state) => state.values.recepcion_folio);
  const proveedorNombre = useStore(form.store, (state) => state.values.proveedor_nombre);
  const monedaCodigo = useStore(form.store, (state) => state.values.moneda_codigo);
  const tasaIva = useStore(form.store, (state) => state.values.tasa_iva);
  const lines = useStore(form.store, (state) => state.values.factura_proveedor_detalles);
  const objetivo = useStore(form.store, (state) => state.values.estatus_objetivo);

  const moneda = monedaCodigo ? { currency: monedaCodigo } : undefined;
  const money = (cents: number) => formatMoneyValueOrDash(centavosAMoneda(cents), moneda);

  // Totales DERIVADOS con la misma función que `buildSupplierInvoicePayload`: lo
  // que se ve aquí es exactamente lo que viaja y lo que copiará la CxP.
  const totales = calcularTotales(lines, tasaIva);
  const selectedDetalleIds = lines.map((line) => line.recepcion_detalle);

  /** Error de la sección de OC: la OC misma o cualquiera de sus derivados. */
  const ocError =
    getError("oc") ?? getError("proveedor") ?? getError("moneda") ?? getError("sucursal");

  return (
    <>
      <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
        <fieldset disabled={isPending}>
          {serverBanner && (
            <div
              ref={bannerRef}
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3"
            >
              <ExclamationTriangleIcon
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="flex-1 text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                {serverBanner}
              </p>
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

          {/* ── Orden de compra y recepción ─────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FacturacionIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Orden de Compra y Recepción
                </h3>
                <p className="text-xs text-slate-500">
                  La factura cubre mercancía recibida de una orden de compra
                </p>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Orden de compra
                </p>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    {oc > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {ocFolio}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {proveedorNombre || "Sin proveedor"}
                          {monedaCodigo ? ` · ${monedaCodigo}` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Ninguna seleccionada</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    rounded="full"
                    onClick={() => setIsOcPickerOpen(true)}
                  >
                    {oc > 0 ? "Cambiar" : "Elegir"}
                  </Button>
                </div>
                {ocError && (
                  <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                    {ocError.message}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Recepción
                </p>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    {recepcion > 0 ? (
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {recepcionFolio}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        {oc > 0 ? "Ninguna seleccionada" : "Elige primero la orden de compra"}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    rounded="full"
                    disabled={oc <= 0}
                    onClick={() => setIsRecepcionPickerOpen(true)}
                  >
                    {recepcion > 0 ? "Cambiar" : "Elegir"}
                  </Button>
                </div>
                {getError("recepcion") && (
                  <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                    {getError("recepcion")?.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Datos de la factura ─────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos de la Factura
              </h3>
              <p className="text-xs text-slate-500">
                Folio del proveedor, vencimiento y tasa de impuesto
              </p>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <form.Field name="folio">
                {(field) => (
                  <FormInput
                    label="Folio"
                    placeholder="Folio de la factura del proveedor"
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
                  <div>
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
                    {!getError("fecha_vencimiento") && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Opcional en borrador; requerida para registrar.
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="tasa_iva">
                {(field) => (
                  <FormInput
                    label="Tasa de IVA (%)"
                    inputMode="decimal"
                    placeholder="Ej. 16"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                      clearError("tasa_iva");
                    }}
                    error={getError("tasa_iva")}
                  />
                )}
              </form.Field>

              <div className="md:col-span-3">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      rows={2}
                      placeholder="Notas internas de la factura (opcional)"
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

          {/* ── Partidas ────────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Partidas
                </h3>
                <p className="text-xs text-slate-500">
                  {recepcion > 0
                    ? "Las partidas no se pueden modificar después de guardar la factura"
                    : "Elige primero la recepción"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                disabled={recepcion <= 0}
                onClick={() => setIsLinesPickerOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Agregar partidas
                </span>
              </Button>
            </div>

            <div className="p-8">
              {getError("factura_proveedor_detalles") && (
                <p
                  className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400"
                >
                  {getError("factura_proveedor_detalles")?.message}
                </p>
              )}

              <form.Field name="factura_proveedor_detalles" mode="array">
                {(arrayField) =>
                  arrayField.state.value.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-8">
                      Sin partidas seleccionadas.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {arrayField.state.value.map((line, index) => {
                        const lineFormError = getError(
                          `factura_proveedor_detalles.${index}._form`,
                        );
                        const importes = calcularImportesLinea(line, tasaIva);
                        return (
                          <div
                            key={lineKeys[index] ?? index}
                            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                    {line.producto_nombre}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Recibido {formatExactQuantityValue(line.cantidad_recibida)}
                                    {line.cantidad_facturada_previa !== "0" &&
                                      ` · Ya facturado ${formatExactQuantityValue(line.cantidad_facturada_previa)}`}
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

                            {line.precio_oc_oculto && (
                              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                <InfoIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                La orden de compra no muestra precios para tu rol: captura el
                                precio de la factura.
                              </p>
                            )}

                            {/* Mismo patrón de aviso que el precio oculto. Solo aparece
                                cuando el descuento de la OC era distinto de cero o el
                                renglón de OC no cuadraba — nunca en el camino normal. */}
                            {line.descuento_manual_requerido && (
                              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                <InfoIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                {DESCUENTO_MANUAL_AVISO}
                              </p>
                            )}

                            {lineFormError && (
                              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                                {lineFormError.message}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <form.Field name={`factura_proveedor_detalles[${index}].cantidad`}>
                                {(field) => (
                                  <FormInput
                                    label="Cantidad"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      // Se sanea a 4 decimales, NO a 2: si recortara al
                                      // teclear, una cantidad sembrada con 3–4 decimales
                                      // perdería su valor real al primer toque sin que
                                      // nadie lo decidiera. El esquema bloquea los
                                      // decimales de más con su mensaje.
                                      field.handleChange(
                                        sanitizeDecimalInput(event.target.value, 4),
                                      );
                                      clearError(`factura_proveedor_detalles.${index}.cantidad`);
                                    }}
                                    error={getError(`factura_proveedor_detalles.${index}.cantidad`)}
                                  />
                                )}
                              </form.Field>

                              <form.Field
                                name={`factura_proveedor_detalles[${index}].precio_unitario`}
                              >
                                {(field) => (
                                  <FormInput
                                    label="Precio unitario"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(
                                        sanitizeDecimalInput(event.target.value, 2),
                                      );
                                      clearError(
                                        `factura_proveedor_detalles.${index}.precio_unitario`,
                                      );
                                    }}
                                    error={getError(
                                      `factura_proveedor_detalles.${index}.precio_unitario`,
                                    )}
                                  />
                                )}
                              </form.Field>

                              <form.Field name={`factura_proveedor_detalles[${index}].descuento`}>
                                {(field) => (
                                  <FormInput
                                    label="Descuento (importe)"
                                    inputMode="decimal"
                                    placeholder={line.descuento_manual_requerido ? "Capturar" : "0.00"}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(
                                        sanitizeDecimalInput(event.target.value, 2),
                                      );
                                      clearError(`factura_proveedor_detalles.${index}.descuento`);
                                    }}
                                    error={getError(
                                      `factura_proveedor_detalles.${index}.descuento`,
                                    )}
                                  />
                                )}
                              </form.Field>
                            </div>

                            {/* Importes DERIVADOS del renglón: no son editables. */}
                            <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              <span>
                                Subtotal{" "}
                                <strong className="text-slate-700 dark:text-slate-200">
                                  {importes ? money(importes.subtotalCents) : "—"}
                                </strong>
                              </span>
                              <span>
                                Impuesto{" "}
                                <strong className="text-slate-700 dark:text-slate-200">
                                  {importes ? money(importes.impuestoCents) : "—"}
                                </strong>
                              </span>
                              <span>
                                Total{" "}
                                <strong className="text-slate-800 dark:text-white">
                                  {importes ? money(importes.totalCents) : "—"}
                                </strong>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </form.Field>
            </div>
          </section>

          {/* ── Totales (derivados, no editables) ───────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-indigo-200 dark:border-indigo-500/20 overflow-hidden mb-6">
            <div className="p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-md">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    Totales de la factura
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Se calculan a partir de las partidas y no se capturan. Al registrar, la
                    cuenta por pagar copia este total.
                  </p>
                  {!totales.completo && lines.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Hay partidas con datos inválidos o sin tasa de IVA: los totales están
                      incompletos.
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums min-w-56">
                  <dt className="text-slate-500 dark:text-slate-400">Subtotal</dt>
                  <dd className="text-right text-slate-700 dark:text-slate-200">
                    {money(totales.subtotalCents)}
                  </dd>
                  <dt className="text-slate-500 dark:text-slate-400">Descuento</dt>
                  <dd className="text-right text-slate-700 dark:text-slate-200">
                    − {money(totales.descuentoCents)}
                  </dd>
                  <dt className="text-slate-500 dark:text-slate-400">Impuestos</dt>
                  <dd className="text-right text-slate-700 dark:text-slate-200">
                    {money(totales.impuestosCents)}
                  </dd>
                  <dt className="font-semibold text-slate-800 dark:text-white pt-1 border-t border-slate-100 dark:border-white/10">
                    Total
                  </dt>
                  <dd className="text-right text-lg font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-white/10">
                    {money(totales.totalCents)}
                  </dd>
                </dl>
              </div>
            </div>
          </section>

          <div className="flex flex-col items-end gap-3 pb-4">
            <p className="max-w-xl text-right text-xs text-slate-500 dark:text-slate-400">
              {REGISTRAR_AVISO}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <FormCancelButton onClick={handleReset} disabled={isPending} />
              {/* El `fieldset` deshabilita ambos botones durante el envío; la
                  etiqueta de pendiente solo va en el que se pulsó. */}
              <FormSubmitButton
                type="button"
                onClick={() => submitAs("Borrador")}
                isPending={isPending && objetivo === "Borrador"}
                loadingLabel="Guardando..."
                className="bg-slate-600! hover:bg-slate-700! focus:ring-slate-500!"
              >
                Guardar borrador
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

      <PurchaseOrderSelectorDialog
        open={isOcPickerOpen}
        onOpenChange={setIsOcPickerOpen}
        selectedOcId={oc}
        onConfirm={handleOcChange}
      />
      <ReceptionSelectorDialog
        open={isRecepcionPickerOpen}
        onOpenChange={setIsRecepcionPickerOpen}
        ocId={oc}
        selectedRecepcionId={recepcion}
        onConfirm={handleRecepcionChange}
      />
      <ReceptionLinesSelectorDialog
        open={isLinesPickerOpen}
        onOpenChange={setIsLinesPickerOpen}
        ocId={oc}
        recepcionId={recepcion}
        monedaCodigo={monedaCodigo}
        alreadySelectedIds={selectedDetalleIds}
        onConfirm={addLines}
      />
    </>
  );
}
