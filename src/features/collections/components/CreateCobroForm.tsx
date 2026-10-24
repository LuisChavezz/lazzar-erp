"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSecondaryButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import { Loader } from "@/src/components/Loader";
import { DeleteIcon, InfoIcon, PlusIcon, ReceiptIcon, RejectIcon } from "@/src/components/Icons";
import { centavosAMoneda, sumImportesEnCentavos } from "@/src/utils/sumImportesEnCentavos";
import { ItemPickerButton } from "@/src/components/ItemPickerButton";
import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { COBRO_REFERENCIA_LABELS } from "../constants/collectionStatus";
import {
  COBRO_METODOS_PAGO,
  COBRO_REFERENCIAS,
  requiresTipoCambio,
  type CobroFormValues,
} from "../schemas/createCobro.schema";
import { customerLabel, useCreateCobroForm, type CobroDraftSeed } from "../hooks/useCreateCobroForm";
import { COBRO_DRAFT_INACTIVE_ACCOUNT_MESSAGE, COBRO_DRAFT_INACTIVE_CLIENT_MESSAGE } from "../utils/cobroDraft";
import { CobroAmount } from "./CobroAmount";
import { CxcSelectorDialog } from "./CxcSelectorDialog";

interface CreateCobroFormProps {
  onSuccess: () => void;
  /**
   * Borrador a editar (ver `CobroDraftEditDialog`). Sin él es un alta: "Cancelar"
   * limpia el formulario; con él, cierra (`onCancel`).
   */
  draft?: CobroDraftSeed;
  onCancel?: () => void;
}

const OPTION_CLS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

export function CreateCobroForm({ onSuccess, draft, onCancel }: CreateCobroFormProps) {
  const {
    form,
    isEdit,
    isPending,
    submittingEstatus,
    isClienteLocked,
    isCuentaInactiva,
    isClienteInactivo,
    moneda,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    customers,
    bankAccountOptions,
    selectorMoneda,
    saldoFor,
    lineKeys,
    serverBanner,
    dismissBanner,
    getError,
    clearError,
    addLines,
    removeLine,
    handleClienteChange,
    handleCuentaChange,
    handleFormSubmit,
    handleSaveDraft,
    handleReset,
  } = useCreateCobroForm({ onSuccess, draft });

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);

  const cliente = useStore(form.store, (state) => state.values.cliente);
  const cuentaBancaria = useStore(form.store, (state) => state.values.cuenta_bancaria);
  const lines = useStore(form.store, (state) => state.values.cobro_detalles);

  const selectedCustomer = customers.find((customer) => customer.id === cliente);
  // Cliente o cuenta del borrador ya inactivos: el backend los rechazaría.
  const isBlocked = isClienteInactivo || isCuentaInactiva;
  const blockedNoteIds =
    [isClienteInactivo && "cobro-cliente-inactivo-note", isCuentaInactiva && "cobro-cuenta-inactiva-note"]
      .filter(Boolean)
      .join(" ") || undefined;
  const canPickLines = cliente > 0 && selectorMoneda !== null;

  // Total DERIVADO de las líneas: la misma suma en centavos que viaja como
  // `total_cobrado`, en la moneda de la cuenta.
  const total = centavosAMoneda(sumImportesEnCentavos(lines));

  if (isLoadingFormData) {
    return <Loader className="py-12" title="Cargando datos" message="Cargando clientes y cuentas bancarias..." />;
  }

  if (isErrorFormData) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">No se pudieron cargar los catálogos</p>
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
            <h3 className="font-semibold text-slate-900 dark:text-white">Faltan configuraciones</h3>
            <p className="text-sm text-slate-500 mt-1">Para registrar un cobro primero se necesita:</p>
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
          {/* Banner de "todo o nada": el alta es atómica. */}
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
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ReceiptIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">Datos del Cobro</h3>
                <p className="text-xs text-slate-500">Cliente, cuenta de destino y referencia bancaria</p>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selector buscable de la app (mismo que los demás selectores
                  apilados): el cliente elegido queda fijo arriba de la lista
                  aunque la búsqueda lo excluya (#262). */}
              <div>
                <ItemPickerButton
                  label="Cliente"
                  placeholder="Seleccionar cliente..."
                  selectedLabel={selectedCustomer ? customerLabel(selectedCustomer) : null}
                  onClick={() => setIsCustomerPickerOpen(true)}
                  error={getError("cliente")}
                  disabled={isClienteLocked}
                />
                {isClienteInactivo ? (
                  <p id="cobro-cliente-inactivo-note" className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {COBRO_DRAFT_INACTIVE_CLIENT_MESSAGE}
                  </p>
                ) : (
                  isClienteLocked && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      Para cambiar de cliente, primero quita las cuentas por cobrar del borrador.
                    </p>
                  )
                )}
              </div>

              <div>
                <FormSelect
                  label="Cuenta bancaria de destino"
                  name="cuenta_bancaria"
                  value={String(cuentaBancaria)}
                  onChange={(event) => handleCuentaChange(Number(event.target.value))}
                  error={getError("cuenta_bancaria")}
                >
                  <option value="0" disabled>
                    Seleccionar...
                  </option>
                  {bankAccountOptions.map((option) => (
                    <option key={option.value} value={option.value} className={OPTION_CLS}>
                      {option.label}
                    </option>
                  ))}
                </FormSelect>
                {isCuentaInactiva && (
                  <p id="cobro-cuenta-inactiva-note" className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {COBRO_DRAFT_INACTIVE_ACCOUNT_MESSAGE}
                  </p>
                )}
              </div>

              {/* Solo fuera de MXN: el backend lo exige y lo manda al REP. */}
              {requiresTipoCambio(moneda) && (
                <form.Field name="tipo_cambio">
                  {(field) => (
                    <FormInput
                      label={`Tipo de cambio (MXN por ${moneda})`}
                      inputMode="decimal"
                      placeholder="0.000000"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(sanitizeDecimalInput(event.target.value, 6));
                        clearError("tipo_cambio");
                      }}
                      error={getError("tipo_cambio")}
                    />
                  )}
                </form.Field>
              )}

              <form.Field name="fecha_cobro">
                {(field) => (
                  // Opcional: vacía, se omite y el backend aplica su default (hoy).
                  <FormInput
                    label="Fecha de cobro"
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("fecha_cobro");
                    }}
                    error={getError("fecha_cobro")}
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
                      field.handleChange(event.target.value as CobroFormValues["metodo_pago"]);
                      clearError("metodo_pago");
                    }}
                    error={getError("metodo_pago")}
                  >
                    {COBRO_METODOS_PAGO.map((metodo) => (
                      <option key={metodo} value={metodo} className={OPTION_CLS}>
                        {metodo}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <form.Field name="referencia">
                {(field) => (
                  <FormSelect
                    label="Referencia"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value as CobroFormValues["referencia"]);
                      clearError("referencia");
                    }}
                    error={getError("referencia")}
                  >
                    {COBRO_REFERENCIAS.map((referencia) => (
                      <option key={referencia} value={referencia} className={OPTION_CLS}>
                        {COBRO_REFERENCIA_LABELS[referencia]}
                      </option>
                    ))}
                  </FormSelect>
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
                      placeholder="Notas internas del cobro (opcional)"
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

          {/* ── Líneas: CxC aplicadas ───────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Cuentas por Cobrar aplicadas
                </h3>
                <p className="text-xs text-slate-500">
                  {canPickLines
                    ? `Facturas del cliente en ${moneda}, la moneda de la cuenta bancaria`
                    : "Selecciona primero el cliente y la cuenta bancaria"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                disabled={!canPickLines}
                onClick={() => setIsPickerOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Agregar cuentas
                </span>
              </Button>
            </div>

            <div className="p-8">
              {getError("cobro_detalles") && (
                <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("cobro_detalles")?.message}
                </p>
              )}

              <form.Field name="cobro_detalles" mode="array">
                {(arrayField) =>
                  arrayField.state.value.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-8">
                      Sin cuentas por cobrar seleccionadas.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {arrayField.state.value.map((line, index) => {
                        const lineFormError = getError(`cobro_detalles.${index}._form`);
                        return (
                          <div
                            key={lineKeys[index] ?? index}
                            className={`rounded-2xl border p-4 space-y-3 ${
                              lineFormError
                                ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/5"
                                : "border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                    {line.factura_folio}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {/* Saldo VIGENTE (se refresca tras un error de saldo). */}
                                    Saldo <CobroAmount value={saldoFor(line)} moneda={line.moneda_codigo || null} />
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
                              <form.Field name={`cobro_detalles[${index}].importe_aplicado`}>
                                {(field) => (
                                  <FormInput
                                    label="Importe a aplicar"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      // Se sanea a 2 decimales; NO se clampa al saldo
                                      // al teclear (el techo lo valida el schema).
                                      field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                                      clearError(`cobro_detalles.${index}.importe_aplicado`);
                                    }}
                                    error={getError(`cobro_detalles.${index}.importe_aplicado`)}
                                  />
                                )}
                              </form.Field>

                              <form.Field name={`cobro_detalles[${index}].observaciones`}>
                                {(field) => (
                                  <FormInput
                                    label="Observaciones de la línea"
                                    placeholder="Opcional"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(event.target.value);
                                      clearError(`cobro_detalles.${index}.observaciones`);
                                    }}
                                    error={getError(`cobro_detalles.${index}.observaciones`)}
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

              {/* Total derivado: es exactamente lo que viaja como `total_cobrado`,
                  y el destino del error de cuadre que el backend reporta ahí. */}
              <div className="mt-6 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total del cobro</span>
                <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
                  <CobroAmount value={total} moneda={moneda} />
                </span>
              </div>
              {getError("total_cobrado") && (
                <p className="mt-2 text-right text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("total_cobrado")?.message}
                </p>
              )}
            </div>
          </section>

          {/* Guardar como borrador no mueve saldos ni exige líneas; registrar
              (o aplicar, en edición) valida el cobro completo. */}
          <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
            {/* En edición cierra sin guardar; en el alta limpia el formulario. */}
            <FormCancelButton
              label={isEdit ? "Cancelar" : undefined}
              onClick={isEdit && onCancel ? onCancel : handleReset}
              disabled={isPending}
            />
            <FormSecondaryButton
              label={
                submittingEstatus === "Borrador" ? "Guardando..." : isEdit ? "Guardar borrador" : "Guardar como borrador"
              }
              onClick={handleSaveDraft}
              disabled={isPending || isBlocked}
              aria-describedby={blockedNoteIds}
            />
            <FormSubmitButton
              isPending={isPending}
              disabled={isBlocked}
              aria-describedby={blockedNoteIds}
              loadingLabel={
                submittingEstatus === "Borrador" ? (isEdit ? "Aplicar cobro" : "Registrar cobro") : isEdit ? "Aplicando..." : "Registrando..."
              }
            >
              {isEdit ? "Aplicar cobro" : "Registrar cobro"}
            </FormSubmitButton>
          </div>
        </fieldset>
      </form>

      {/* Selectores apilados encima del formulario, que sigue montado detrás. */}
      <MainDialog
        open={isCustomerPickerOpen}
        onOpenChange={setIsCustomerPickerOpen}
        title=""
        maxWidth="640px"
        showCloseButton={false}
      >
        {/* Se monta solo abierto: la selección tentativa arranca en el cliente vigente. */}
        {isCustomerPickerOpen && (
          <SingleSelectPickerDialogContent
            title="Seleccionar Cliente"
            subtitle="Cambiar de cliente vacía las cuentas por cobrar agregadas"
            statusColor="emerald"
            items={customers}
            searchPlaceholder="Buscar por razón social, nombre, RFC o correo..."
            filterPredicate={(customer, term) =>
              `${customer.razon_social} ${customer.nombre} ${customer.rfc ?? ""} ${customer.correo ?? ""}`
                .toLowerCase()
                .includes(term)
            }
            getKey={(customer) => customer.id}
            selectedKey={selectedCustomer?.id ?? null}
            pinSelected
            emptyMessage="No hay clientes activos."
            noResultsMessage="No se encontraron clientes"
            renderContent={(customer) => (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {customerLabel(customer)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {[customer.nombre, customer.rfc].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            onConfirm={(customer) => {
              handleClienteChange(customer);
              setIsCustomerPickerOpen(false);
            }}
            onCancel={() => setIsCustomerPickerOpen(false)}
          />
        )}
      </MainDialog>

      {selectorMoneda && cliente > 0 && (
        <CxcSelectorDialog
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          clienteId={cliente}
          moneda={selectorMoneda}
          alreadySelectedIds={lines.map((line) => line.cxc)}
          onConfirm={addLines}
        />
      )}
    </>
  );
}
