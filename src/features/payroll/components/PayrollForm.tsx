"use client";

import { useEffect } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import {
  ExclamationTriangleIcon,
  PayrollIcon,
  PlusIcon,
  XIcon,
} from "@/src/components/Icons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { formatCents } from "@/src/utils/moneyCents";
import { formatQuincena, parseQuincenaKey, type Quincena } from "@/src/utils/quincena";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Payroll } from "../interfaces/payroll.interface";
import {
  CODIGO_MAX_LENGTH,
  CONCEPTO_MAX_LENGTH,
  TIPO_DETALLE_OPTIONS,
  type TipoDetalleNomina,
} from "../constants/payrollChoices";
import { usePayrollForm } from "../hooks/usePayrollForm";
import { formatPayrollPeriod } from "./PayrollColumns";
import { QuincenaPicker } from "./QuincenaPicker";

interface PayrollFormProps {
  onSuccess: () => void;
  payrollToEdit?: Payroll | null;
  defaultQuincena: Quincena;
  /**
   * Avisa al diálogo contenedor si hay un guardado en curso (guarda de red o
   * escritura), para que no se pueda cerrar a medias: perdería los errores
   * por campo y permitiría reabrir y reenviar encima.
   */
  onPendingChange?: (pending: boolean) => void;
}

const OPTION_CLASS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

const SALARY_SOURCE_HINT = {
  contrato: "Tomado del contrato vigente del empleado. Puedes ajustarlo.",
  puesto: "El empleado no tiene contrato vigente con salario: se tomó el de su puesto.",
  none: "El empleado no tiene salario en su contrato vigente ni en su puesto.",
} as const;

const SECTION_CLASS =
  "bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden mb-6";
const SECTION_HEADER_CLASS =
  "px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/2";

export default function PayrollForm({
  onSuccess,
  payrollToEdit,
  defaultQuincena,
  onPendingChange,
}: PayrollFormProps) {
  const {
    form,
    formRef,
    isEditing,
    isPending,
    lineKeys,
    totals,
    empleadoOptions,
    editingEmployee,
    sucursalLabel,
    empresaLabel,
    salaryInfo,
    isLoadingCatalogs,
    isErrorEmployeeCatalogs,
    isErrorSalaryCatalogs,
    getError,
    clearError,
    addLine,
    removeLine,
    changeEmpleado,
    changeQuincena,
    handleReset,
    handleFormSubmit,
  } = usePayrollForm({ onSuccess, payrollToEdit, defaultQuincena });

  // Sincroniza el "en curso" con el diálogo; al desmontarse lo libera.
  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  const hasNoEmployees =
    !isLoadingCatalogs && !isErrorEmployeeCatalogs && empleadoOptions.length === 0;
  const empleadoPlaceholder = isLoadingCatalogs
    ? "Cargando empleados..."
    : isErrorEmployeeCatalogs
      ? "No se pudo cargar el catálogo de empleados"
      : hasNoEmployees
        ? "No hay empleados en tus sucursales"
        : "Seleccionar...";

  const editingEmployeeName = payrollToEdit
    ? editingEmployee
      ? getEmployeeFullName(editingEmployee)
      : `Empleado #${payrollToEdit.empleado}`
    : "";

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="min-w-0">
        {/* ── Cabecera ─────────────────────────────────────────────────── */}
        <section className={SECTION_CLASS}>
          <div className={SECTION_HEADER_CLASS}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <PayrollIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                  Nómina
                </h3>
                <p className="text-xs text-slate-500">
                  {isEditing
                    ? "El empleado y la quincena no se pueden cambiar"
                    : "Empleado, quincena y salario de referencia"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* `empleado` define también `sucursal` y `empresa`: ninguna se captura. */}
            <div>
              {isEditing ? (
                <FormInput label="Empleado" name="empleado" value={editingEmployeeName} readOnly disabled />
              ) : (
                <form.Field name="empleado">
                  {(field) => (
                    <FormSelect
                      label="Empleado"
                      name={field.name}
                      value={String(field.state.value)}
                      disabled={isLoadingCatalogs || isErrorEmployeeCatalogs}
                      onChange={(event) => changeEmpleado(Number(event.target.value))}
                      onBlur={field.handleBlur}
                      error={getError("empleado")}
                    >
                      <option value="0" disabled>
                        {empleadoPlaceholder}
                      </option>
                      {empleadoOptions.map((option) => (
                        <option key={option.id} value={option.id} className={OPTION_CLASS}>
                          {option.label}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              )}
              {!isEditing && isErrorEmployeeCatalogs && (
                <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                  No se pudo cargar el catálogo de empleados o de sucursales. Cierra el diálogo e
                  inténtalo de nuevo.
                </p>
              )}
              {hasNoEmployees && !isEditing && (
                <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                  Ningún empleado pertenece a tus sucursales.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Sucursal" name="sucursal" value={sucursalLabel} readOnly disabled />
              <FormInput label="Empresa" name="empresa" value={empresaLabel} readOnly disabled />
            </div>

            <div className="md:col-span-2">
              {isEditing ? (
                <FormInput
                  label="Periodo"
                  name="periodo"
                  value={payrollToEdit ? formatPayrollPeriod(payrollToEdit) : ""}
                  readOnly
                  disabled
                />
              ) : (
                <form.Field name="quincena">
                  {(field) => {
                    const quincena = parseQuincenaKey(field.state.value) ?? defaultQuincena;
                    return (
                      <div>
                        <QuincenaPicker
                          name="nomina-quincena"
                          value={quincena}
                          onChange={changeQuincena}
                          disabled={isPending}
                        />
                        <p className="mt-2 ml-1 text-xs text-slate-500 dark:text-slate-400">
                          Periodo: {formatQuincena(quincena)}
                        </p>
                        {getError("quincena") && (
                          <p className="mt-1 ml-1 text-xs text-red-600 dark:text-red-400">
                            {getError("quincena")?.message}
                          </p>
                        )}
                      </div>
                    );
                  }}
                </form.Field>
              )}
            </div>

            <div>
              <form.Field name="salario_base">
                {(field) => (
                  <FormInput
                    label="Salario base mensual (opcional)"
                    inputMode="decimal"
                    placeholder="0.00"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                      clearError("salario_base");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("salario_base")}
                  />
                )}
              </form.Field>
              <p className="mt-1 ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                {isEditing
                  ? "Informativo: el neto sale de los renglones."
                  : isErrorSalaryCatalogs
                    ? "No se pudieron cargar contratos o puestos: captura el salario a mano."
                    : salaryInfo
                      ? SALARY_SOURCE_HINT[salaryInfo.source ?? "none"]
                      : "Se prellena con el salario del empleado. Informativo: el neto sale de los renglones."}
              </p>
            </div>

            <div className="md:col-span-2">
              <form.Field name="observaciones">
                {(field) => (
                  <FormTextarea
                    label="Observaciones (opcional)"
                    rows={2}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("observaciones");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("observaciones")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        {/* ── Renglones ────────────────────────────────────────────────── */}
        <section className={SECTION_CLASS}>
          <div className={SECTION_HEADER_CLASS}>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Percepciones y deducciones
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Al guardar, esta lista reemplaza todos los renglones de la nómina"
                  : "Un renglón por concepto"}
              </p>
            </div>
            <Button type="button" variant="secondary" rounded="full" onClick={addLine}>
              <span className="inline-flex items-center gap-1.5">
                <PlusIcon className="w-3.5 h-3.5" />
                Agregar renglón
              </span>
            </Button>
          </div>

          <div className="p-6 sm:p-8">
            {getError("detalles") && (
              <p className="mb-4 text-sm font-medium text-rose-600 dark:text-rose-400">
                {getError("detalles")?.message}
              </p>
            )}

            <form.Field name="detalles" mode="array">
              {(arrayField) =>
                arrayField.state.value.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic py-4 text-center">
                    Sin renglones: la nómina queda en $0.00. Agrega al menos una percepción para
                    poder marcarla como pagada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {arrayField.state.value.map((_, index) => {
                      const lineFormError = getError(`detalles.${index}._form`);
                      return (
                        <div
                          key={lineKeys[index] ?? index}
                          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-6 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {index + 1}
                            </span>
                            <div className="grid flex-1 min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[150px_130px_minmax(0,1fr)_150px]">
                              <form.Field name={`detalles[${index}].tipo`}>
                                {(field) => (
                                  <FormSelect
                                    label="Tipo"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(event.target.value as TipoDetalleNomina);
                                      clearError(`detalles.${index}.tipo`);
                                    }}
                                    onBlur={field.handleBlur}
                                    error={getError(`detalles.${index}.tipo`)}
                                  >
                                    {TIPO_DETALLE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value} className={OPTION_CLASS}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </FormSelect>
                                )}
                              </form.Field>
                              <form.Field name={`detalles[${index}].codigo`}>
                                {(field) => (
                                  <FormInput
                                    label="Código (opcional)"
                                    forceUppercase
                                    maxLength={CODIGO_MAX_LENGTH}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(event.target.value);
                                      clearError(`detalles.${index}.codigo`);
                                    }}
                                    onBlur={field.handleBlur}
                                    error={getError(`detalles.${index}.codigo`)}
                                  />
                                )}
                              </form.Field>
                              <form.Field name={`detalles[${index}].concepto`}>
                                {(field) => (
                                  <FormInput
                                    label="Concepto"
                                    forceUppercase
                                    maxLength={CONCEPTO_MAX_LENGTH}
                                    placeholder="p. ej. Bono de puntualidad"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(event.target.value);
                                      clearError(`detalles.${index}.concepto`);
                                    }}
                                    onBlur={field.handleBlur}
                                    error={getError(`detalles.${index}.concepto`)}
                                  />
                                )}
                              </form.Field>
                              <form.Field name={`detalles[${index}].monto`}>
                                {(field) => (
                                  <FormInput
                                    label="Monto"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="text-right tabular-nums"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) => {
                                      field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                                      clearError(`detalles.${index}.monto`);
                                    }}
                                    onBlur={field.handleBlur}
                                    error={getError(`detalles.${index}.monto`)}
                                  />
                                )}
                              </form.Field>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              aria-label={`Quitar renglón ${index + 1}`}
                              title="Quitar renglón"
                              className="mt-6 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg cursor-pointer border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 transition-colors"
                            >
                              <XIcon className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                          {lineFormError && (
                            <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                              {lineFormError.message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </form.Field>
          </div>
        </section>

        {/* ── Totales (vista previa) ───────────────────────────────────── */}
        <section
          className={`rounded-3xl border overflow-hidden mb-6 ${
            totals.neto < 0
              ? "border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5"
              : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5"
          }`}
        >
          <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-3 min-w-0 max-w-md">
              {totals.neto < 0 && (
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              )}
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    totals.neto < 0
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {!totals.completo
                    ? "Hay montos con formato inválido"
                    : totals.neto < 0
                      ? "El neto es negativo: las deducciones superan a las percepciones"
                      : "Vista previa de los totales"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Informativo: el servidor recalcula los totales al guardar.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-4 sm:gap-6 text-right">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Percepciones
                </dt>
                <dd className="text-sm sm:text-base font-bold tabular-nums text-slate-800 dark:text-white">
                  {formatCents(totals.percepciones)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Deducciones
                </dt>
                <dd className="text-sm sm:text-base font-bold tabular-nums text-slate-800 dark:text-white">
                  {formatCents(totals.deducciones)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Neto
                </dt>
                <dd
                  className={`text-sm sm:text-base font-bold tabular-nums ${
                    totals.neto < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatCents(totals.neto)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-6">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Nómina" : "Crear Nómina"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
