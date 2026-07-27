"use client";

import {
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { Loader } from "@/src/components/Loader";
import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import {
  ExclamationTriangleIcon,
  InfoIcon,
  LayersIcon,
} from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import {
  packingLineProductoNombre,
  usePackingStep2Form,
  type PackingZeroPendingCause,
} from "../hooks/usePackingStep2Form";
import type { PackingStep1Values } from "../schemas/packing.schema";

interface PackingWizardStep2Props {
  step1: PackingStep1Values;
  onBack: () => void;
  onSuccess: () => void;
}

/** `decimal_places=3` de `peso_total`/`volumen_total` en el backend. */
const HEADER_DECIMAL_PLACES = 3;

/**
 * Copy del aviso "sin pendiente" cuando SÍ hay líneas (ver `zeroPendingCause`
 * en `usePackingStep2Form`) — distingue "ya se empacó todo" de "nunca se
 * asignó nada" en primer lugar, para no sugerir un empaque que nunca ocurrió.
 * Ninguna de las dos redacta el estado como un error del usuario: ambas son
 * datos históricos del picking, no algo que se hizo mal en este asistente.
 */
const ZERO_PENDING_COPY: Record<PackingZeroPendingCause, { title: string; subtitle: string }> = {
  "fully-packed": {
    title: "Este picking ya fue completamente empacado",
    subtitle: "Regresa para elegir otro picking.",
  },
  "never-assigned": {
    title: "Este picking no tiene cantidad asignada para empacar",
    subtitle:
      "Sus líneas no tienen cantidad asignada — puede tratarse de un picking generado antes del flujo de surtido parcial. Regresa para elegir otro picking.",
  },
  mixed: {
    title: "Este picking ya no tiene nada pendiente por empacar",
    subtitle: "Regresa para elegir otro picking.",
  },
};

export function PackingWizardStep2({ step1, onBack, onSuccess }: PackingWizardStep2Props) {
  const {
    rows,
    pendingRowsCount,
    zeroPendingCause,
    picking,
    isLoading,
    isError,
    header,
    setHeader,
    quantities,
    lineObservaciones,
    setQuantity,
    setLineObservacion,
    selectedCount,
    serverBanner,
    dismissBanner,
    staleNotice,
    dismissStaleNotice,
    isPending,
    handleSubmit,
  } = usePackingStep2Form({ pickingId: step1.picking, onSuccess });

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando pendientes"
        message="Consultando lo que queda por empacar de este picking..."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            No se pudieron cargar los pendientes del picking
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            Regresa e intenta seleccionar el picking de nuevo.
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
      {/* ── Resumen del picking elegido ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Picking</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{picking?.folio ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Pedido</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{picking?.pedido_folio ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Cliente</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{picking?.cliente_nombre ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Almacén</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{picking?.almacen_nombre ?? "—"}</p>
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
        {/* ── Encabezado propio de packing (todo opcional) ────────────────── */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Detalles del empaque</h3>
            <p className="text-[11px] text-slate-500">Cajas, peso y volumen (opcional)</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* `name` en cada campo NO es decorativo: `FormInput`/`FormTextarea`
                derivan de él el `id` que enlaza su `<label htmlFor>`. Sin `name`
                ni `id`, el label queda huérfano (lector de pantalla sin
                etiqueta, y clic en el label no enfoca). El resto del proyecto lo
                obtiene implícito del `name` del campo de TanStack Form; este
                encabezado vive en `useState`, así que se declara a mano. */}
            <FormInput
              label="Número de cajas"
              name="numero_cajas"
              type="number"
              min={0}
              step={1}
              value={header.numero_cajas === 0 ? "" : header.numero_cajas}
              placeholder="0"
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                setHeader((prev) => ({
                  ...prev,
                  numero_cajas: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed,
                }));
              }}
            />
            <FormInput
              label="Peso total (kg)"
              name="peso_total"
              type="text"
              inputMode="decimal"
              value={header.peso_total}
              placeholder="0.000"
              onChange={(event) =>
                setHeader((prev) => ({
                  ...prev,
                  peso_total: sanitizeDecimalInput(event.target.value, HEADER_DECIMAL_PLACES),
                }))
              }
            />
            <FormInput
              label="Volumen total (m³)"
              name="volumen_total"
              type="text"
              inputMode="decimal"
              value={header.volumen_total}
              placeholder="0.000"
              onChange={(event) =>
                setHeader((prev) => ({
                  ...prev,
                  volumen_total: sanitizeDecimalInput(event.target.value, HEADER_DECIMAL_PLACES),
                }))
              }
            />
            <div className="md:col-span-3">
              <FormTextarea
                label="Observaciones (opcional)"
                name="observaciones"
                placeholder="Notas del packing"
                rows={2}
                value={header.observaciones}
                onChange={(event) =>
                  setHeader((prev) => ({ ...prev, observaciones: event.target.value }))
                }
              />
            </div>
          </div>
        </section>

        {noPending ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <InfoIcon className="w-5 h-5" />
            </div>
            {/* Un picking sin líneas en absoluto es un caso aparte (sin causa que
                clasificar); con líneas pero sin nada pendiente, la copia distingue
                "ya se empacó todo" de "nunca se asignó nada" — ver
                `ZERO_PENDING_COPY` y `zeroPendingCause`. */}
            {rows.length === 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Este picking no tiene líneas registradas
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Regresa para elegir otro picking.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {ZERO_PENDING_COPY[zeroPendingCause ?? "mixed"].title}
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {ZERO_PENDING_COPY[zeroPendingCause ?? "mixed"].subtitle}
                </p>
              </div>
            )}
          </div>
        ) : (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <LayersIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Líneas por empacar</h3>
                <p className="text-[11px] text-slate-500">
                  Captura la cantidad a empacar en este packing (máximo: lo pendiente por línea)
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {rows.map((row) => {
                  const key = String(row.picking_detalle);
                  const pendiente = Number.parseFloat(row.cantidad_pendiente_empacar) || 0;
                  const sinPendiente = pendiente <= 0;
                  const qtyValue = quantities[key] ?? "";
                  const hasQty = qtyValue.trim() !== "" && Number.parseFloat(qtyValue) > 0;

                  return (
                    <div key={key} className={`py-3 px-2 ${sinPendiente ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {packingLineProductoNombre(row)}
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
                          {/* `cantidad_surtida` se muestra solo como contexto informativo: el
                              backend valida contra `cantidad_asignada`, no contra lo surtido —
                              ver nota en `PackingOnboardingLine`. */}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            Asignada: {formatExactQuantityValue(row.cantidad_asignada)} · Surtida:{" "}
                            {formatExactQuantityValue(row.cantidad_surtida)} · Ya empacada:{" "}
                            {formatExactQuantityValue(row.cantidad_ya_empacada)} ·{" "}
                            <span className={sinPendiente ? "" : "font-semibold text-slate-700 dark:text-slate-200"}>
                              Pendiente: {formatExactQuantityValue(row.cantidad_pendiente_empacar)}
                            </span>
                          </p>
                        </div>

                        <DecimalQuantityInput
                          value={qtyValue}
                          max={pendiente}
                          disabled={sinPendiente}
                          onChange={(next) => setQuantity(row.picking_detalle, next)}
                          label={`Cantidad a empacar de ${packingLineProductoNombre(row)}`}
                        />
                      </div>

                      {/* Observaciones por línea (opcional) — solo cuando hay cantidad. */}
                      {hasQty && (
                        <div className="mt-2 pl-1">
                          <FormInput
                            variant="compact"
                            placeholder="Observaciones de esta línea (opcional)"
                            value={lineObservaciones[key] ?? ""}
                            onChange={(event) => setLineObservacion(row.picking_detalle, event.target.value)}
                            aria-label={`Observaciones de ${packingLineProductoNombre(row)}`}
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
          Registrar packing
        </FormSubmitButton>
      </div>
    </form>
  );
}
