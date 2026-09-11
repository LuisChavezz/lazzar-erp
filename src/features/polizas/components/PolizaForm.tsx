"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ContabilidadIcon,
  ExclamationTriangleIcon,
  InfoIcon,
  PlusIcon,
  XIcon,
} from "@/src/components/Icons";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { POLIZA_TIPOS } from "../interfaces/poliza.interface";
import {
  centavosAMoneda,
  estaCuadrada,
  sumarLineasEnCentavos,
} from "../schemas/poliza.schema";
import { usePolizaForm } from "../hooks/usePolizaForm";
import { CuentaContableSelectorDialog } from "./CuentaContableSelectorDialog";

interface PolizaFormProps {
  onSuccess: () => void;
}

/**
 * Disparador del selector de cuenta contable: mismo lenguaje visual que
 * `FormSelect` (borde, fondo, chevron) para leerse como un selector —no como un
 * campo de texto— aunque abra un diálogo apilado en vez de un `<select>` nativo.
 *
 * Copia deliberada del `ItemPickerButton` de `StockTransferForm`, que es local a
 * ese archivo. Extraerlo a `src/components/` obligaría a reescribir aquel
 * formulario en esta tarea; queda como candidato a compartir cuando aparezca un
 * tercer consumidor.
 */
function CuentaPickerButton({
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
        <p className="text-xs text-red-600 mt-1 font-medium">{error.message}</p>
      )}
    </div>
  );
}

/**
 * Resumen del lado en que quedó UN movimiento (cargo, abono o ninguno).
 *
 * La partida doble se lee por lados, y con los dos campos en "0.00" —el estado
 * inicial de un renglón nuevo— nada en la fila indicaría que todavía falta
 * elegir uno. Este chip lo dice sin esperar al envío, con la misma cuenta en
 * CENTAVOS que usa el esquema (no `Number(...) > 0` sobre el string, que daría
 * `true` para un "0.001" que el campo ni siquiera admite).
 */
function LadoDelAsiento({ cargo, abono }: { cargo: string; abono: string }) {
  const { cargos, abonos, completo } = sumarLineasEnCentavos([
    { cuenta_contable: 0, centro_costo: 0, cargo, abono, referencia: "", observaciones: "" },
  ]);

  if (!completo) return null;

  if (cargos > 0 && abonos > 0) {
    return (
      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
        Cargo y abono a la vez
      </span>
    );
  }
  if (cargos > 0) {
    return (
      <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
        Cargo {centavosAMoneda(cargos)}
      </span>
    );
  }
  if (abonos > 0) {
    return (
      <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
        Abono {centavosAMoneda(abonos)}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
      Sin importe
    </span>
  );
}

export default function PolizaForm({ onSuccess }: PolizaFormProps) {
  const {
    form,
    formRef,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    branches,
    cuentasContables,
    centrosCosto,
    lineKeys,
    serverBanner,
    bannerErrorTick,
    dismissBanner,
    getError,
    clearError,
    addLine,
    removeLine,
    submitAs,
    handleFormSubmit,
    handleReset,
  } = usePolizaForm({ onSuccess });

  // Índice del movimiento que abrió el selector de cuenta contable. `null` =
  // cerrado. Un solo diálogo sirve a todos los renglones — patrón de
  // `StockTransferForm`.
  const [cuentaPickerIndex, setCuentaPickerIndex] = useState<number | null>(null);

  // El banner de "todo o nada" aparece al inicio del formulario; si el usuario
  // está desplazado hacia un movimiento posterior, el aviso queda fuera de vista.
  // `bannerErrorTick` cambia en CADA rechazo (aunque el mensaje se repita), así
  // que el scroll se dispara en todos los envíos fallidos, no solo en el primero.
  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bannerErrorTick > 0) {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bannerErrorTick]);

  // ── Suscripciones reactivas ──────────────────────────────────────────────
  const lines = useStore(form.store, (state) => state.values.poliza_detalles);
  // Con qué intención se está enviando: la fija `submitAs` justo antes del envío,
  // así que sirve para poner la etiqueta de pendiente en el botón correcto.
  const objetivo = useStore(form.store, (state) => state.values.estatus_objetivo);

  // ── Cuadre en vivo ───────────────────────────────────────────────────────
  // Se calcula EN CENTAVOS ENTEROS con la misma función que usa el `superRefine`
  // del esquema, así que lo que se pinta aquí y lo que valida el envío no pueden
  // discrepar. No se consulta `/validar-cuadre/`: sería un viaje al servidor para
  // saber algo que el formulario ya tiene delante.
  const { cargos, abonos, completo, hayImportes } = sumarLineasEnCentavos(lines);
  const diferencia = cargos - abonos;
  // `hayImportes` además del cuadre: un formulario recién abierto tiene todos los
  // importes en cero y `0 === 0` lo haría pasar por cuadrado, afirmando el cuadre
  // de una póliza vacía y habilitando "Contabilizar" sobre ella.
  const cuadrada = completo && hayImportes && estaCuadrada(cargos, abonos);
  // "Guardar borrador" NUNCA depende del cuadre: el backend crea sin validarlo.
  const puedeContabilizar = cuadrada && !isPending;

  const centroCostoOptions = centrosCosto.map((centro) => ({
    value: centro.id,
    label: `${centro.codigo} - ${centro.nombre}`,
  }));

  const cuentaLabel = (id: number): string | null => {
    if (id <= 0) return null;
    const cuenta = cuentasContables.find((item) => item.id === id);
    // El id puede no estar en el catálogo si la cuenta dejó de aceptar
    // movimientos entre la selección y el render: se muestra el id en crudo en
    // vez de fingir que no hay nada elegido.
    return cuenta ? `${cuenta.codigo} - ${cuenta.nombre}` : `Cuenta #${id}`;
  };

  // ── Estados previos al formulario ────────────────────────────────────────
  if (isLoadingFormData) {
    return (
      <Loader
        className="py-12"
        title="Cargando catálogos"
        message="Cargando sucursales, cuentas contables y centros de costo..."
      />
    );
  }

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
                Faltan configuraciones para capturar una póliza
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Antes de registrar asientos contables, verifica lo siguiente:
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
      {/* `ref`: `usePolizaForm` lo usa para llevar a la vista el primer campo
          inválido cuando la validación local falla. */}
      <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
        <fieldset disabled={isPending}>
          {/* Banner de "todo o nada": el alta es atómica, así que ante un error
              del backend NADA quedó registrado — ni la cabecera ni un solo
              movimiento. */}
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
              <p className="flex-1 text-sm text-red-700 dark:text-red-300">
                {serverBanner}
              </p>
              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Descartar aviso"
                className="p-1 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* ── Datos de la póliza ──────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ContabilidadIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Datos de la Póliza
                </h3>
                <p className="text-xs text-slate-500">
                  La fecha contable la asigna el servidor al guardar
                </p>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <form.Field name="sucursal">
                {(field) => (
                  <FormSelect
                    label="Sucursal"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      field.handleChange(Number.isNaN(next) ? 0 : next);
                      clearError("sucursal");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("sucursal")}
                  >
                    <option value="0" disabled>
                      Seleccionar sucursal...
                    </option>
                    {branches.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {branch.codigo} - {branch.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <form.Field name="tipo">
                {(field) => (
                  <FormSelect
                    label="Tipo de póliza"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(
                        event.target.value as (typeof POLIZA_TIPOS)[number],
                      );
                      clearError("tipo");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("tipo")}
                  >
                    {POLIZA_TIPOS.map((tipo) => (
                      <option
                        key={tipo}
                        value={tipo}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {tipo}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <form.Field name="folio">
                {(field) => (
                  // El backend NO autogenera folio para las pólizas capturadas a
                  // mano, y el formulario lo exige aunque el API lo acepte nulo:
                  // `Poliza.__str__` devuelve el folio y revienta si es `None`.
                  // Las pólizas que el backend genera solo usan `POL-######`;
                  // conviene una serie distinta para no chocar con ellas (el
                  // folio no es único en la base de datos).
                  <FormInput
                    label="Folio"
                    placeholder="Ej. DIA-2026-001"
                    forceUppercase
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("folio");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("folio")}
                  />
                )}
              </form.Field>

              <form.Field name="centro_costo">
                {(field) => (
                  // Centro de costo de la CABECERA. Cada movimiento tiene además
                  // el suyo (`PolizaDetalle.centro_costo`): son dos campos
                  // distintos del modelo, no una duplicación de la interfaz. Este
                  // describe a qué centro pertenece la póliza completa; el de la
                  // línea permite desglosar un asiento entre varios.
                  <FormSelect
                    label="Centro de costo de la póliza (opcional)"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      field.handleChange(Number.isNaN(next) ? 0 : next);
                      clearError("centro_costo");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("centro_costo")}
                  >
                    <option value="0">Sin centro de costo</option>
                    {centroCostoOptions.map((opt) => (
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

              <div className="md:col-span-2">
                <form.Field name="concepto">
                  {(field) => (
                    <FormTextarea
                      label="Concepto (opcional)"
                      rows={2}
                      placeholder="Descripción del asiento: qué operación registra esta póliza"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearError("concepto");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("concepto")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          {/* ── Movimientos ─────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Movimientos
                </h3>
                <p className="text-xs text-slate-500">
                  Cada renglón lleva importe en el cargo o en el abono, nunca en
                  ambos
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                onClick={addLine}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Agregar movimiento
                </span>
              </Button>
            </div>

            <div className="p-8">
              {/* Error a nivel del arreglo: mínimo de movimientos o descuadre al
                  intentar contabilizar. */}
              {getError("poliza_detalles") && (
                <p className="mb-4 text-sm font-medium text-rose-600 dark:text-rose-400">
                  {getError("poliza_detalles")?.message}
                </p>
              )}

              <form.Field name="poliza_detalles" mode="array">
                {(arrayField) => (
                  <div className="space-y-4">
                    {arrayField.state.value.map((line, index) => {
                      const lineFormError = getError(`poliza_detalles.${index}._form`);
                      return (
                        <div
                          key={lineKeys[index] ?? index}
                          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                {index + 1}
                              </span>
                              <LadoDelAsiento cargo={line.cargo} abono={line.abono} />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              // Un solo movimiento sigue siendo un documento que
                              // el esquema acepta (`min(1)`), así que se permite
                              // bajar hasta uno; el cuadre lo bloqueará al
                              // contabilizar si no tiene contrapartida.
                              disabled={arrayField.state.value.length <= 1}
                              aria-label={`Quitar movimiento ${index + 1}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
                            >
                              <XIcon className="w-4 h-4" aria-hidden="true" />
                              Quitar
                            </button>
                          </div>

                          {lineFormError && (
                            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                              {lineFormError.message}
                            </p>
                          )}

                          {/* Los DOS selectores del movimiento: la cuenta
                              contable (obligatoria, diálogo buscable) y su
                              centro de costo (opcional, `FormSelect`). */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <form.Field
                              name={`poliza_detalles[${index}].cuenta_contable`}
                            >
                              {(field) => (
                                <CuentaPickerButton
                                  label="Cuenta contable"
                                  placeholder="Seleccionar cuenta..."
                                  selectedLabel={cuentaLabel(field.state.value)}
                                  onClick={() => setCuentaPickerIndex(index)}
                                  error={getError(
                                    `poliza_detalles.${index}.cuenta_contable`,
                                  )}
                                  disabled={isPending}
                                />
                              )}
                            </form.Field>

                            <form.Field
                              name={`poliza_detalles[${index}].centro_costo`}
                            >
                              {(field) => (
                                <FormSelect
                                  label="Centro de costo (opcional)"
                                  name={field.name}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    const next = Number(event.target.value);
                                    field.handleChange(
                                      Number.isNaN(next) ? 0 : next,
                                    );
                                    clearError(
                                      `poliza_detalles.${index}.centro_costo`,
                                    );
                                  }}
                                  onBlur={field.handleBlur}
                                  error={getError(
                                    `poliza_detalles.${index}.centro_costo`,
                                  )}
                                >
                                  <option value="0">
                                    {/* Por defecto hereda el criterio de la
                                        cabecera: no se copia el valor, se deja
                                        nulo, que es lo que el backend guarda. */}
                                    Sin centro de costo
                                  </option>
                                  {centroCostoOptions.map((opt) => (
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

                          {/* Cargo XOR abono + referencia. El lado en el que
                              quedó el asiento se resume en el encabezado del
                              renglón (ver `LadoDelAsiento`), porque con los dos
                              campos vacíos —el estado inicial— nada indicaría que
                              falta elegir uno. */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <form.Field name={`poliza_detalles[${index}].cargo`}>
                              {(field) => (
                                <FormInput
                                  label="Cargo"
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  name={field.name}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    field.handleChange(
                                      sanitizeDecimalInput(event.target.value, 2),
                                    );
                                    clearError(`poliza_detalles.${index}.cargo`);
                                    // El error de "captura cargo o abono, no
                                    // ambos" se fija en el ABONO: editar el cargo
                                    // también lo resuelve, así que se limpia.
                                    clearError(`poliza_detalles.${index}.abono`);
                                  }}
                                  onBlur={field.handleBlur}
                                  error={getError(`poliza_detalles.${index}.cargo`)}
                                />
                              )}
                            </form.Field>

                            <form.Field name={`poliza_detalles[${index}].abono`}>
                              {(field) => (
                                <FormInput
                                  label="Abono"
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  name={field.name}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    field.handleChange(
                                      sanitizeDecimalInput(event.target.value, 2),
                                    );
                                    clearError(`poliza_detalles.${index}.abono`);
                                    clearError(`poliza_detalles.${index}.cargo`);
                                  }}
                                  onBlur={field.handleBlur}
                                  error={getError(`poliza_detalles.${index}.abono`)}
                                />
                              )}
                            </form.Field>

                            <form.Field name={`poliza_detalles[${index}].referencia`}>
                              {(field) => (
                                <FormInput
                                  label="Referencia (opcional)"
                                  placeholder="Documento o folio de respaldo"
                                  name={field.name}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    field.handleChange(event.target.value);
                                    clearError(
                                      `poliza_detalles.${index}.referencia`,
                                    );
                                  }}
                                  onBlur={field.handleBlur}
                                  error={getError(
                                    `poliza_detalles.${index}.referencia`,
                                  )}
                                />
                              )}
                            </form.Field>
                          </div>

                          <form.Field name={`poliza_detalles[${index}].observaciones`}>
                            {(field) => (
                              <FormInput
                                label="Observaciones (opcional)"
                                placeholder="Nota del movimiento"
                                name={field.name}
                                value={field.state.value}
                                onChange={(event) => {
                                  field.handleChange(event.target.value);
                                  clearError(
                                    `poliza_detalles.${index}.observaciones`,
                                  );
                                }}
                                onBlur={field.handleBlur}
                                error={getError(
                                  `poliza_detalles.${index}.observaciones`,
                                )}
                              />
                            )}
                          </form.Field>
                        </div>
                      );
                    })}
                  </div>
                )}
              </form.Field>
            </div>
          </section>

          {/* ── Cuadre en vivo ──────────────────────────────────────────── */}
          <section
            className={`rounded-3xl border overflow-hidden mb-6 ${
              cuadrada
                ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                : "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"
            }`}
          >
            <div className="p-6 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-start gap-3 min-w-0">
                {cuadrada ? (
                  <CheckCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      cuadrada
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {/* Sin importes NO se dice "cuadra": una póliza vacía suma
                        0 = 0 y afirmarlo sería un visto bueno sobre un documento
                        que todavía no existe. Tampoco se dice "no cuadra", que
                        sonaría a error habiendo un 0.00 legítimo. */}
                    {!completo
                      ? "Hay importes con formato inválido"
                      : !hayImportes
                        ? "Captura el importe de los movimientos"
                        : cuadrada
                          ? "La póliza cuadra"
                          : `La póliza no cuadra: diferencia de ${centavosAMoneda(Math.abs(diferencia))}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                    {/* Se dice explícitamente qué bloquea y qué no: es la regla
                        que el backend aplica (crear no valida el cuadre, solo
                        contabilizar lo hace) y no una restricción inventada. */}
                    Un borrador puede guardarse descuadrado. Para contabilizarlo,
                    la suma de cargos debe igualar a la de abonos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Total cargos
                  </p>
                  <p className="text-base font-bold tabular-nums text-slate-800 dark:text-white">
                    {centavosAMoneda(cargos)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Total abonos
                  </p>
                  <p className="text-base font-bold tabular-nums text-slate-800 dark:text-white">
                    {centavosAMoneda(abonos)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Diferencia
                  </p>
                  <p
                    className={`text-base font-bold tabular-nums ${
                      cuadrada
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {centavosAMoneda(diferencia)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
            <FormCancelButton onClick={handleReset} disabled={isPending} />
            {/* Dos salidas explícitas. Guardar como borrador NO exige cuadre —el
                backend tampoco—; contabilizar sí, y solo se habilita cuando el
                cálculo en centavos de arriba dice que cuadra. */}
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
              onClick={() => submitAs("Contabilizada")}
              isPending={isPending && objetivo === "Contabilizada"}
              loadingLabel="Contabilizando..."
              // `disabled` se pasa COMPLETO (con `isPending` incluido) porque
              // `FormSubmitButton` esparce `props` después de calcular su propio
              // `disabled`: lo que llegue por esta prop gana, y omitir el
              // pendiente reabriría el botón a mitad del envío.
              disabled={!puedeContabilizar}
              title={
                cuadrada
                  ? undefined
                  : "Los cargos y los abonos deben sumar lo mismo para contabilizar"
              }
              className="bg-emerald-600! hover:bg-emerald-700! focus:ring-emerald-500!"
            >
              Guardar y contabilizar
            </FormSubmitButton>
          </div>
        </fieldset>
      </form>

      {/* Selector apilado ENCIMA del formulario, que permanece montado detrás
          para no perder lo capturado en los demás movimientos. */}
      <CuentaContableSelectorDialog
        open={cuentaPickerIndex !== null}
        onOpenChange={(open) => {
          if (!open) setCuentaPickerIndex(null);
        }}
        cuentas={cuentasContables}
        selectedId={
          cuentaPickerIndex === null
            ? 0
            : form.getFieldValue(
                `poliza_detalles[${cuentaPickerIndex}].cuenta_contable`,
              )
        }
        onSelect={(id) => {
          if (cuentaPickerIndex === null) return;
          form.setFieldValue(
            `poliza_detalles[${cuentaPickerIndex}].cuenta_contable`,
            id,
          );
          clearError(`poliza_detalles.${cuentaPickerIndex}.cuenta_contable`);
          setCuentaPickerIndex(null);
        }}
      />
    </>
  );
}
