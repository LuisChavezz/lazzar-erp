"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { useQualityInspectionForm } from "../hooks/useQualityInspectionForm";
import type { ReceptionLineVariant } from "../hooks/useReceptionLineVariants";
import { QUALITY_RESULTADO_OPTIONS } from "../constants/qualityResultado";
import { formatQuantity, QUALITY_DECIMAL_PLACES } from "../utils/qualityQuantities";
import type {
  QualityInspector,
  QualityPendingReception,
  QualityResultado,
} from "../interfaces/quality-inspection.interface";

interface QualityInspectionFormProps {
  reception: QualityPendingReception;
  inspectores: QualityInspector[];
  /**
   * Variante por renglón (`recepcion_detalle` → estado de su variante). Solo
   * trae entradas en recepciones de OP; en OC el renglón no tiene variante.
   */
  lineVariants: Map<number, ReceptionLineVariant>;
  /** `C-WMS-CALIDAD`: sin él se puede revisar el formulario, pero no enviarlo. */
  canSubmit: boolean;
  onSuccess: () => void;
  onStale: () => void;
  onCancel: () => void;
}

/** Tope de `inspectores` en el backend (`values(...)[:200]`, por nombre). */
const BACKEND_INSPECTOR_LIMIT = 200;

const inspectorLabel =(inspector: QualityInspector) => {
  const nombre = [inspector.nombre, inspector.apellido_paterno].filter(Boolean).join(" ");
  return inspector.numero_empleado ? `${inspector.numero_empleado} — ${nombre}` : nombre;
};

function VariantCaption({ state }: { state: ReceptionLineVariant | undefined }) {
  if (!state) return null;
  if (state.isLoading) {
    return <p className="text-[11px] text-slate-400">Cargando talla y color…</p>;
  }
  if (state.isError || !state.variant) {
    return (
      <p className="text-[11px] text-amber-600 dark:text-amber-400">
        No se pudo cargar la talla y el color de este renglón
      </p>
    );
  }
  const { talla_nombre, color_nombre, sku } = state.variant;
  return (
    <p className="text-[11px] text-slate-500 dark:text-slate-400">
      Talla <span className="font-semibold text-slate-700 dark:text-slate-200">{talla_nombre || "—"}</span>
      {" · "}Color <span className="font-semibold text-slate-700 dark:text-slate-200">{color_nombre || "—"}</span>
      {sku ? <span className="font-mono"> · {sku}</span> : null}
    </p>
  );
}

export function QualityInspectionForm({
  reception,
  inspectores,
  lineVariants,
  canSubmit,
  onSuccess,
  onStale,
  onCancel,
}: QualityInspectionFormProps) {
  const {
    form,
    formRef,
    isValid,
    isPending,
    formError,
    pendingLineCount,
    isInspectorMissing,
    handleRevealErrors,
    lineHasVisibleError,
    getLineError,
    getInspectorError,
    markLineTouched,
    markInspectorTouched,
    handleFormSubmit,
    handleFormKeyDown,
  } = useQualityInspectionForm({ reception, onSuccess, onStale });

  return (
    <form
      ref={formRef}
      onSubmit={handleFormSubmit}
      onKeyDown={handleFormKeyDown}
      noValidate
      className="w-full"
    >
      <fieldset disabled={isPending} className="space-y-5">
        {/* ── Inspector ─────────────────────────────────────────────────── */}
        <form.Field name="inspector">
          {(field) => (
            <FormSelect
              label="Inspector"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(Number(event.target.value) || 0);
                markInspectorTouched();
              }}
              onBlur={() => {
                field.handleBlur();
                markInspectorTouched();
              }}
              error={getInspectorError()}
            >
              <option value={0} disabled>
                {inspectores.length === 0 ? "No hay empleados activos" : "Seleccionar..."}
              </option>
              {inspectores.map((inspector) => (
                <option
                  key={inspector.id}
                  value={inspector.id}
                  className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                >
                  {inspectorLabel(inspector)}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>
        {inspectores.length >= BACKEND_INSPECTOR_LIMIT && (
          <p className="-mt-3 ml-1 text-xs text-amber-700 dark:text-amber-400">
            Se muestran los primeros {BACKEND_INSPECTOR_LIMIT} empleados activos en orden
            alfabético; si el inspector no aparece, repórtalo a sistemas.
          </p>
        )}

        {/* ── Renglones ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2">
            Renglones ({reception.detalle.length}) — aprobada + rechazada debe sumar lo recibido
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 ml-1 mb-2">
            Si algún renglón tiene material en cuarentena, deja la recepción sin inspeccionar hasta resolverlo.
          </p>
          <form.Field name="lineas" mode="array">
            {(arrayField) => (
              <ul className="space-y-3">
                {arrayField.state.value.map((line, index) => {
                  const source = reception.detalle[index];
                  const sumaError = getLineError(index, "suma");
                  return (
                    <li
                      key={line.recepcion_detalle}
                      className={`rounded-xl border p-4 ${
                        lineHasVisibleError(index)
                          ? "border-rose-300 dark:border-rose-500/40"
                          : "border-slate-200 dark:border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 wrap-break-word">
                            {source?.producto_nombre ?? "—"}
                          </p>
                          <VariantCaption state={lineVariants.get(line.recepcion_detalle)} />
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block text-[11px] text-slate-400">Recibida</span>
                          <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                            {formatQuantity(line.cantidad_recibida)}
                          </span>
                        </div>
                      </div>

                      {/* Cantidades en columnas angostas y Resultado con el resto
                          del ancho: en 4 columnas iguales el select truncaba
                          "Concesión Control de Calidad". Motivo baja a su fila. */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-[9rem_9rem_minmax(0,1fr)] gap-3">
                        <form.Field name={`lineas[${index}].cantidad_aprobada`}>
                          {(field) => (
                            <FormInput
                              label="Aprobada"
                              name={field.name}
                              inputMode="decimal"
                              placeholder="0"
                              className="text-right tabular-nums"
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(
                                  sanitizeDecimalInput(event.target.value, QUALITY_DECIMAL_PLACES),
                                );
                                markLineTouched(index);
                              }}
                              onBlur={field.handleBlur}
                              error={getLineError(index, "cantidad_aprobada")}
                            />
                          )}
                        </form.Field>

                        <form.Field name={`lineas[${index}].cantidad_rechazada`}>
                          {(field) => (
                            <FormInput
                              label="Rechazada"
                              name={field.name}
                              inputMode="decimal"
                              placeholder="0"
                              className="text-right tabular-nums"
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(
                                  sanitizeDecimalInput(event.target.value, QUALITY_DECIMAL_PLACES),
                                );
                                markLineTouched(index);
                              }}
                              onBlur={field.handleBlur}
                              error={getLineError(index, "cantidad_rechazada")}
                            />
                          )}
                        </form.Field>

                        <div className="col-span-2 md:col-span-1">
                        <form.Field name={`lineas[${index}].resultado`}>
                          {(field) => (
                            <FormSelect
                              label="Resultado"
                              name={field.name}
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(event.target.value as QualityResultado);
                                markLineTouched(index);
                              }}
                              onBlur={field.handleBlur}
                              error={getLineError(index, "resultado")}
                            >
                              <option value="" disabled>
                                Seleccionar...
                              </option>
                              {QUALITY_RESULTADO_OPTIONS.map((option) => (
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
                        </div>

                        <div className="col-span-2 md:col-span-3">
                        <form.Field name={`lineas[${index}].motivo_rechazo`}>
                          {(field) => (
                            <FormInput
                              label="Motivo (opcional)"
                              name={field.name}
                              placeholder="Motivo del rechazo"
                              forceUppercase
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(event.target.value);
                                markLineTouched(index);
                              }}
                              onBlur={field.handleBlur}
                              error={getLineError(index, "motivo_rechazo")}
                            />
                          )}
                        </form.Field>
                        </div>
                      </div>

                      {sumaError && (
                        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-rose-400">
                          {sumaError.message}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </form.Field>
          {formError && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-rose-400">
              {formError}
            </p>
          )}
        </div>

        {/* ── Observaciones ─────────────────────────────────────────────── */}
        <form.Field name="observaciones">
          {(field) => (
            <FormTextarea
              label="Observaciones (opcional)"
              rows={2}
              name={field.name}
              placeholder="Notas de la inspección"
              forceUppercase
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>

        {/* ── Botones ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          {!canSubmit && (
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:mr-auto">
              No tienes permiso para registrar inspecciones de calidad.
            </p>
          )}
          {/* El botón sigue deshabilitado mientras falte algo; este aviso dice
              QUÉ falta y, al pulsarlo, marca en rojo los renglones pendientes
              (también los no tocados) y lleva la vista al primero. */}
          {canSubmit && !isValid && (pendingLineCount > 0 || isInspectorMissing) && (
            <button
              type="button"
              onClick={handleRevealErrors}
              className="text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer sm:mr-auto"
            >
              {[
                isInspectorMissing ? "Falta el inspector" : null,
                pendingLineCount > 0
                  ? `${pendingLineCount === 1 ? "Falta 1 renglón" : `Faltan ${pendingLineCount} renglones`} por completar`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {" — ver pendientes"}
            </button>
          )}
          <FormCancelButton onClick={onCancel} label="Cancelar" disabled={isPending} />
          {canSubmit && (
            <FormSubmitButton
              isPending={isPending}
              loadingLabel="Registrando..."
              disabled={!isValid}
              title={isValid ? undefined : "Completa todos los renglones para registrar"}
            >
              Registrar inspección
            </FormSubmitButton>
          )}
        </div>
      </fieldset>
    </form>
  );
}
