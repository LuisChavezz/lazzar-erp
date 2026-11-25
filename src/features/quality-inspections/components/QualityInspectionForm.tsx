"use client";

import { useStore } from "@tanstack/react-form";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { useQualityInspectionForm } from "../hooks/useQualityInspectionForm";
import type { ReceptionLineVariant } from "../hooks/useReceptionLineVariants";
import { QUALITY_RESULTADO_OPTIONS } from "../constants/qualityResultado";
import {
  formatQuantity,
  isSplittableIntoQualitySteps,
  QUALITY_DECIMAL_PLACES,
  toScaledUnits,
  unitsToQualityString,
} from "../utils/qualityQuantities";
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
  /** SKU, código y talla por renglón (`recepcion_detalle`), del detalle de la recepción. */
  lineInfo: Map<number, QualityLineInfo>;
  /** `C-WMS-RECEPCIONES` (EC-947): sin él se puede revisar el formulario, pero no enviarlo. */
  canSubmit: boolean;
  onSuccess: () => void;
  onStale: () => void;
  onCancel: () => void;
}

export interface QualityLineInfo {
  sku: string | null;
  codigo: string | null;
  talla: string | null;
}

/** "12.00" → "12"; "12.50" → "12.5": se lee mejor y el schema lo acepta igual. */
const sinCeros = (v: string) => (v.includes(".") ? v.replace(/0+$/, "").replace(/\.$/, "") : v) || "0";

/** Recibida en el formato de Calidad (2 decimales), o `null` si no se puede repartir. */
const recibidaComoCalidad = (recibida: string): string | null => {
  const units = toScaledUnits(recibida);
  return units !== null && isSplittableIntoQualitySteps(units) ? sinCeros(unitsToQualityString(units)) : null;
};

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
  lineInfo,
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

  // ── Atajos de captura ─────────────────────────────────────────────────
  // Lo normal es que todo venga bien: un clic aprueba todo y solo se ajusta
  // lo que trae defecto. Siguen las mismas reglas del schema (aprobada +
  // rechazada = recibida; "rechazo" solo con aprobada 0).
  const values = useStore(form.store, (state) => state.values);
  const setLinea = (index: number, aprobada: string, rechazada: string, resultado: QualityResultado | "") => {
    form.setFieldValue(`lineas[${index}].cantidad_aprobada`, aprobada);
    form.setFieldValue(`lineas[${index}].cantidad_rechazada`, rechazada);
    form.setFieldValue(`lineas[${index}].resultado`, resultado as QualityResultado);
    markLineTouched(index);
  };
  const aprobarRenglon = (index: number) => {
    const total = recibidaComoCalidad(values.lineas[index]?.cantidad_recibida ?? "");
    if (total !== null) setLinea(index, total, "0", "liberado");
  };
  const rechazarRenglon = (index: number) => {
    const total = recibidaComoCalidad(values.lineas[index]?.cantidad_recibida ?? "");
    if (total !== null) setLinea(index, "0", total, "rechazo");
  };
  const aprobarTodo = () => values.lineas.forEach((_, index) => aprobarRenglon(index));
  /** Al escribir lo aprobado, lo que falta para lo recibido pasa a rechazado. */
  const completarRenglon = (index: number, aprobada: string) => {
    const linea = values.lineas[index];
    const total = toScaledUnits(linea?.cantidad_recibida ?? "");
    const aprob = toScaledUnits(aprobada);
    if (!linea || total === null || aprob === null || aprob > total) return;
    const resto = total - aprob;
    if (!isSplittableIntoQualitySteps(resto)) return;
    form.setFieldValue(`lineas[${index}].cantidad_rechazada`, sinCeros(unitsToQualityString(resto)));
    if (!linea.resultado || (linea.resultado === "rechazo" && aprob > 0)) {
      form.setFieldValue(`lineas[${index}].resultado`, (aprob === 0 ? "rechazo" : "liberado") as QualityResultado);
    }
  };
  const lineaLista = (l: (typeof values.lineas)[number]) =>
    !!l.resultado && (l.cantidad_aprobada !== "" || l.cantidad_rechazada !== "");
  const listos = values.lineas.filter(lineaLista).length;
  const totalRechazadas = values.lineas.reduce((acc, l) => acc + (Number(l.cantidad_rechazada) || 0), 0);

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
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div className="ml-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Prendas ({reception.detalle.length})
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <b className="tabular-nums text-slate-700 dark:text-slate-200">{listos}</b> de {values.lineas.length} listas
                {totalRechazadas > 0 && (
                  <> · <span className="text-rose-600 dark:text-rose-400">{formatQuantity(String(totalRechazadas))} rechazadas</span></>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={aprobarTodo}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="m5 10 3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Aprobar todo (liberado)
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 mb-2">
            Ajusta solo lo que traiga defecto: al escribir lo aprobado, el resto pasa a rechazado. Si algo va a
            cuarentena, deja la recepción sin inspeccionar hasta resolverlo.
          </p>
          <form.Field name="lineas" mode="array">
            {(arrayField) => (
              <ul className="space-y-2">
                {arrayField.state.value.map((line, index) => {
                  const source = reception.detalle[index];
                  const info = lineInfo.get(line.recepcion_detalle);
                  const sumaError = getLineError(index, "suma");
                  const rechazada = Number(line.cantidad_rechazada) || 0;
                  const listo = lineaLista(line);
                  const mostrarMotivo = rechazada > 0 || line.resultado === "rechazo";
                  return (
                    <li
                      key={line.recepcion_detalle}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        lineHasVisibleError(index)
                          ? "border-rose-300 dark:border-rose-500/40"
                          : listo
                            ? rechazada > 0
                              ? "border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/[0.03]"
                              : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/[0.03]"
                            : "border-slate-200 dark:border-white/10"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {/* Prenda: SKU primero, que es como la buscan */}
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                listo ? (rechazada > 0 ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-300 dark:bg-slate-600"
                              }`}
                            />
                            <span className="truncate font-mono text-sm font-semibold text-slate-800 dark:text-white">
                              {info?.sku || info?.codigo || source?.producto_nombre || "—"}
                            </span>
                            {info?.talla && (
                              <span className="shrink-0 rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {info.talla}
                              </span>
                            )}
                          </p>
                          <p className="truncate pl-4 text-[11px] text-slate-500 dark:text-slate-400" title={source?.producto_nombre}>
                            {source?.producto_nombre}
                          </p>
                          <div className="pl-4">
                            <VariantCaption state={lineVariants.get(line.recepcion_detalle)} />
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Recibida</span>
                          <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                            {formatQuantity(line.cantidad_recibida)}
                          </span>
                        </div>

                        <form.Field name={`lineas[${index}].cantidad_aprobada`}>
                          {(field) => (
                            <label className="w-24">
                              <span className="block text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Aprobada</span>
                              <input
                                name={field.name}
                                inputMode="decimal"
                                placeholder="0"
                                value={field.state.value}
                                aria-invalid={!!getLineError(index, "cantidad_aprobada") || undefined}
                                onChange={(event) => {
                                  const v = sanitizeDecimalInput(event.target.value, QUALITY_DECIMAL_PLACES);
                                  field.handleChange(v);
                                  completarRenglon(index, v);
                                  markLineTouched(index);
                                }}
                                onBlur={field.handleBlur}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1 text-right text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </label>
                          )}
                        </form.Field>

                        <form.Field name={`lineas[${index}].cantidad_rechazada`}>
                          {(field) => (
                            <label className="w-24">
                              <span className="block text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400">Rechazada</span>
                              <input
                                name={field.name}
                                inputMode="decimal"
                                placeholder="0"
                                value={field.state.value}
                                aria-invalid={!!getLineError(index, "cantidad_rechazada") || undefined}
                                onChange={(event) => {
                                  field.handleChange(sanitizeDecimalInput(event.target.value, QUALITY_DECIMAL_PLACES));
                                  markLineTouched(index);
                                }}
                                onBlur={field.handleBlur}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1 text-right text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </label>
                          )}
                        </form.Field>

                        <form.Field name={`lineas[${index}].resultado`}>
                          {(field) => (
                            <label className="w-44">
                              <span className="block text-[10px] uppercase tracking-wider text-slate-400">Resultado</span>
                              <select
                                name={field.name}
                                value={field.state.value}
                                aria-invalid={!!getLineError(index, "resultado") || undefined}
                                onChange={(event) => {
                                  field.handleChange(event.target.value as QualityResultado);
                                  markLineTouched(index);
                                }}
                                onBlur={field.handleBlur}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                              >
                                <option value="" disabled>
                                  Seleccionar…
                                </option>
                                {QUALITY_RESULTADO_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value} className="bg-white dark:bg-zinc-900">
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </form.Field>

                        {/* Atajos por renglón */}
                        <div className="flex gap-1 self-end">
                          <button
                            type="button"
                            title="Todo bien: aprobar lo recibido"
                            aria-label={`Aprobar todo ${info?.sku ?? source?.producto_nombre ?? ""}`}
                            onClick={() => aprobarRenglon(index)}
                            className="grid h-7 w-7 place-items-center rounded-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="m5 10 3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Rechazar todo lo recibido"
                            aria-label={`Rechazar todo ${info?.sku ?? source?.producto_nombre ?? ""}`}
                            onClick={() => rechazarRenglon(index)}
                            className="grid h-7 w-7 place-items-center rounded-full text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                          >
                            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {mostrarMotivo && (
                        <form.Field name={`lineas[${index}].motivo_rechazo`}>
                          {(field) => (
                            <input
                              name={field.name}
                              placeholder="Motivo del rechazo (opcional)"
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(event.target.value.toUpperCase());
                                markLineTouched(index);
                              }}
                              onBlur={field.handleBlur}
                              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          )}
                        </form.Field>
                      )}

                      {[sumaError, getLineError(index, "cantidad_aprobada"), getLineError(index, "cantidad_rechazada"), getLineError(index, "resultado"), getLineError(index, "motivo_rechazo")]
                        .filter((e, i, arr) => e && arr.findIndex((x) => x?.message === e.message) === i)
                        .map((e) => (
                          <p key={e!.message} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-rose-400">
                            {e!.message}
                          </p>
                        ))}
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
