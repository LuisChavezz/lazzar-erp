"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { ConciliacionIcon } from "@/src/components/Icons";
import { formatShortDate } from "@/src/utils/formatDate";
import type {
  ConciliacionBancaria,
  PrepararConciliacionResponse,
} from "../interfaces/bank-reconciliation.interface";
import { usePrepararConciliacionForm } from "../hooks/usePrepararConciliacionForm";

interface PrepararConciliacionFormProps {
  /** Se invoca con la respuesta de `preparar`, para aterrizar en su detalle. */
  onPrepared: (resultado: PrepararConciliacionResponse) => void;
  /** Abre una conciliación ya existente en vez de preparar una nueva. */
  onOpenExisting: (conciliacion: ConciliacionBancaria) => void;
  onCancel: () => void;
}

/**
 * Captura de una conciliación: cuenta, periodo y saldo del estado de cuenta.
 *
 * NO muestra resultados. `preparar` calcula los saldos en el servidor y esta
 * pantalla aterriza en el detalle del borrador, que es donde vive el cuadre —un
 * documento que se crea y luego se opera, como una póliza, no un asistente de
 * varios pasos—.
 */
export default function PrepararConciliacionForm({
  onPrepared,
  onOpenExisting,
  onCancel,
}: PrepararConciliacionFormProps) {
  const {
    form,
    formRef,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    bankAccountOptions,
    cerradasEnConflicto,
    cerradaExacta,
    estadoSolapamiento,
    bloqueadoPorSolapamiento,
    reintentarSolapamiento,
    getError,
    clearFieldError,
    handleReset,
    handleFormSubmit,
  } = usePrepararConciliacionForm({ onPrepared });

  if (isLoadingFormData) {
    return (
      <Loader
        className="py-12"
        title="Cargando catálogos"
        message="Cargando cuentas bancarias..."
      />
    );
  }

  if (isErrorFormData) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudieron cargar las cuentas bancarias
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Revisa tu conexión e intenta abrir el diálogo de nuevo.
        </p>
      </div>
    );
  }

  // Bloqueo de CONFIGURACIÓN, no un error de red: sin cuentas activas no hay
  // nada que conciliar. Mismo tratamiento que `missingItems` en pólizas.
  if (missingItems.length > 0) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Falta configurar antes de conciliar
        </p>
        <ul className="mt-2 list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
          {missingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  const hayConflicto = estadoSolapamiento === "conflicto";

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending}>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-6">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ConciliacionIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Periodo a conciliar
              </h3>
              <p className="text-xs text-slate-500">
                Cuenta, rango de fechas y saldo que reporta el estado de cuenta
              </p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <form.Field name="cuenta_bancaria">
                {(field) => (
                  <FormSelect
                    label="Cuenta bancaria"
                    name={field.name}
                    value={String(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(Number(event.target.value));
                      clearFieldError("cuenta_bancaria");
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
            </div>

            <div>
              <form.Field name="fecha_inicio">
                {(field) => (
                  <FormInput
                    label="Fecha inicial"
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("fecha_inicio");
                    }}
                    error={getError("fecha_inicio")}
                  />
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="fecha_final">
                {(field) => (
                  <FormInput
                    label="Fecha final"
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldError("fecha_final");
                    }}
                    error={getError("fecha_final")}
                  />
                )}
              </form.Field>
            </div>

            <div className="md:col-span-2">
              <form.Field name="saldo_estado_cuenta">
                {(field) => (
                  <FormInput
                    label="Saldo del estado de cuenta"
                    inputMode="decimal"
                    placeholder="Ej. 125430.50"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      // Entra CRUDO y lo juzga el esquema: filtrar caracteres
                      // aquí pegaría los que quedan y convertiría un importe en
                      // otro que el usuario nunca capturó.
                      field.handleChange(event.target.value);
                      clearFieldError("saldo_estado_cuenta");
                    }}
                    error={getError("saldo_estado_cuenta")}
                  />
                )}
              </form.Field>
              {!getError("saldo_estado_cuenta") && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  El saldo de cierre que reporta el banco. Admite negativo si la
                  cuenta está sobregirada.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Comprobación previa: el periodo no puede pisar una conciliación ya
            cerrada. El backend no lo impide —volvería a tomar movimientos que
            ya están conciliados—, así que el bloqueo vive aquí, y falla
            CERRADO: los tres avisos de abajo bloquean el envío. */}
        {estadoSolapamiento === "verificando" && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Verificando el periodo…
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Se está comprobando que el rango no se cruce con una conciliación
              ya cerrada. Podrás preparar en cuanto termine.
            </p>
          </div>
        )}

        {/* Un error NO es un conflicto: no se sabe si lo hay. Por eso el aviso
            dice "no se pudo verificar" y ofrece reintentar, en vez de afirmar
            que el periodo choca con algo. */}
        {estadoSolapamiento === "error" && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              No se pudo verificar el periodo
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              No fue posible comprobar si el rango se cruza con una conciliación
              ya cerrada, así que no se puede preparar todavía: hacerlo sobre un
              periodo cerrado volvería a tomar movimientos ya conciliados.
            </p>
            <button
              type="button"
              onClick={reintentarSolapamiento}
              className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
            >
              Reintentar la verificación
            </button>
          </div>
        )}

        {hayConflicto && (
          <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              {cerradaExacta
                ? "Este periodo ya tiene una conciliación cerrada"
                : "El periodo se cruza con una conciliación ya cerrada"}
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
              {cerradaExacta
                ? "No se vuelve a preparar: hacerlo tomaría de nuevo movimientos que ya quedaron conciliados."
                : "Ajusta el rango para que no se cruce con los periodos cerrados de abajo."}
            </p>
            <ul className="mt-3 space-y-1">
              {cerradasEnConflicto.map((conciliacion) => (
                <li
                  key={conciliacion.id}
                  className="text-xs text-rose-700 dark:text-rose-300 tabular-nums"
                >
                  {/* `timeZone: "UTC"`: sin él, "2026-01-01" se pintaría como
                      "31 dic 2025" al oeste de Greenwich — y aquí eso le diría
                      al usuario que choca con OTRO periodo cerrado. */}
                  {conciliacion.fecha_inicio
                    ? formatShortDate(conciliacion.fecha_inicio, { timeZone: "UTC" })
                    : "—"}{" "}
                  →{" "}
                  {conciliacion.fecha_final
                    ? formatShortDate(conciliacion.fecha_final, { timeZone: "UTC" })
                    : "—"}
                </li>
              ))}
            </ul>
            {/* Solo con una coincidencia EXACTA se ofrece abrirla: con un cruce
                parcial no hay "la misma" conciliación que mostrar. */}
            {cerradaExacta && (
              <button
                type="button"
                onClick={() => onOpenExisting(cerradaExacta)}
                className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300 underline hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
              >
                Ver la conciliación existente
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pb-4">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer"
          >
            Cerrar
          </button>
          {/* `isPending` va TAMBIÉN dentro de `disabled`: `FormSubmitButton`
              esparce sus props DESPUÉS de calcular `disabled`, así que un
              `disabled` propio pisa su guarda interna de pendiente. Hornearlo
              aquí es lo que impide el doble envío — y con él, dos borradores
              del mismo periodo, que la idempotencia de servicio del backend no
              alcanza a evitar.

              `bloqueadoPorSolapamiento` cubre el conflicto real Y los estados
              en los que todavía no hay un resultado confiable para este rango
              (verificando o con error). */}
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Preparando..."
            disabled={bloqueadoPorSolapamiento || isPending}
          >
            Preparar conciliación
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
