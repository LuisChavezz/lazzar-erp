"use client";

import {
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { Loader } from "@/src/components/Loader";
import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import {
  ExclamationTriangleIcon,
  InfoIcon,
  LayersIcon,
} from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { usePickingStep2Form } from "../hooks/usePickingStep2Form";
import type { PickingHeaderValues } from "../schemas/picking.schema";
import type { PickingOnboardingTalla } from "../interfaces/picking-onboarding.interface";

interface PickingWizardStep2Props {
  header: PickingHeaderValues;
  onBack: () => void;
  onSuccess: () => void;
}

function tallaProductoNombre(row: PickingOnboardingTalla): string {
  return row.producto_variante_nombre ?? row.producto_nombre ?? "—";
}

export function PickingWizardStep2({
  header,
  onBack,
  onSuccess,
}: PickingWizardStep2Props) {
  const {
    rows,
    pendingRowsCount,
    pedido,
    almacenNombre,
    isLoading,
    isError,
    quantities,
    observaciones,
    setQuantity,
    setObservacion,
    selectedCount,
    serverBanner,
    dismissBanner,
    staleNotice,
    dismissStaleNotice,
    isPending,
    handleSubmit,
  } = usePickingStep2Form({ header, onSuccess });

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando pendientes"
        message="Consultando lo que queda por surtir de este pedido..."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            No se pudieron cargar los pendientes del pedido
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            Regresa e intenta seleccionar el pedido de nuevo.
          </p>
        </div>
        <div className="flex justify-start">
          <FormSecondaryButton label="Regresar" onClick={onBack} />
        </div>
      </div>
    );
  }

  const noPending = rows.length === 0 || pendingRowsCount === 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleSubmit();
      }}
      className="w-full space-y-5"
    >
      {/* ── Resumen del encabezado capturado ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Pedido</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{pedido?.folio ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Cliente</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{pedido?.cliente_nombre ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Almacén</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{almacenNombre}</p>
        </div>
      </div>

      {/* ── Aviso de dato desactualizado (no fatal) ─────────────────────── */}
      {staleNotice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
        >
          <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="min-w-0 flex-1 text-sm text-amber-800 dark:text-amber-200">{staleNotice}</p>
          <button
            type="button"
            onClick={dismissStaleNotice}
            aria-label="Descartar aviso"
            className="shrink-0 p-1 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Banner de error del backend ─────────────────────────────────── */}
      {serverBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-rose-700 dark:text-rose-300">{serverBanner}</p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Descartar aviso"
            className="shrink-0 p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <fieldset disabled={isPending} className="space-y-5">
        {noPending ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {rows.length === 0
                  ? "Este pedido no tiene tallas registradas"
                  : "Este pedido ya no tiene tallas pendientes por surtir"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Regresa para elegir otro pedido.
              </p>
            </div>
          </div>
        ) : (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <LayersIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Tallas por surtir</h3>
                <p className="text-[11px] text-slate-500">
                  Captura la cantidad a surtir en esta entrega (máximo: lo pendiente por talla)
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {rows.map((row) => {
                  const key = String(row.pedido_detalle_talla);
                  const pendiente = Number.parseFloat(row.cantidad_pendiente) || 0;
                  const sinPendiente = pendiente <= 0;
                  const qtyValue = quantities[key] ?? "";
                  const hasQty = qtyValue.trim() !== "" && Number.parseFloat(qtyValue) > 0;

                  return (
                    <div key={key} className={`py-3 px-2 ${sinPendiente ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {tallaProductoNombre(row)}
                            </p>
                            {row.talla_nombre && (
                              <span className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                                Talla {row.talla_nombre}
                              </span>
                            )}
                            {row.color_nombre && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">{row.color_nombre}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            Pedida: {formatExactQuantityValue(row.cantidad_pedida)} · Asignada:{" "}
                            {formatExactQuantityValue(row.cantidad_ya_asignada)} ·{" "}
                            <span className={sinPendiente ? "" : "font-semibold text-slate-700 dark:text-slate-200"}>
                              Pendiente: {formatExactQuantityValue(row.cantidad_pendiente)}
                            </span>
                          </p>
                        </div>

                        <DecimalQuantityInput
                          value={qtyValue}
                          max={pendiente}
                          disabled={sinPendiente}
                          onChange={(next) => setQuantity(row.pedido_detalle_talla, next)}
                          label={`Cantidad a surtir de ${tallaProductoNombre(row)}`}
                        />
                      </div>

                      {/* Observaciones por línea (opcional) — solo cuando hay cantidad. */}
                      {hasQty && (
                        <div className="mt-2 pl-1">
                          <FormInput
                            variant="compact"
                            placeholder="Observaciones de esta línea (opcional)"
                            value={observaciones[key] ?? ""}
                            onChange={(event) => setObservacion(row.pedido_detalle_talla, event.target.value)}
                            aria-label={`Observaciones de ${tallaProductoNombre(row)}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </fieldset>

      {/* ── Botones ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={isPending} />
        {/* `disabled` DEBE incluir `isPending`: `FormSubmitButton` esparce
            `{...props}` después de su `disabled` interno, así que un `disabled`
            propio lo sobrescribe — hay que "hornear" el pending aquí para que el
            botón quede realmente inhabilitado durante el envío (sin doble POST). */}
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Registrando..."
          disabled={isPending || selectedCount === 0}
        >
          Registrar picking
        </FormSubmitButton>
      </div>
    </form>
  );
}
