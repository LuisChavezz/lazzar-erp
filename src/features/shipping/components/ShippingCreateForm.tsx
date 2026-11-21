"use client";

import { FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { ExclamationTriangleIcon, InfoIcon, RefreshIcon } from "@/src/components/Icons";
import { shippingOnboardingErrorMessage } from "../hooks/useShippingOnboarding";
import { useShippingForm } from "../hooks/useShippingForm";
import { ShippingLinesTable } from "./ShippingLinesTable";
import { ShippingPackingSelector } from "./ShippingPackingSelector";
import {
  SHIPMENT_GUIA_MAX_LENGTH,
  SHIPMENT_PAQUETERIAS,
  type ShipmentTipoEnvio,
} from "../schemas/shipping.schema";

interface ShippingCreateFormProps {
  /** Se invoca tras registrar el despacho correctamente (cierra el diálogo). */
  onSuccess: () => void;
}

const TIPOS_ENVIO: { value: ShipmentTipoEnvio; label: string; hint: string }[] = [
  { value: "PAQUETERIA", label: "Paquetería", hint: "Con guía de rastreo" },
  { value: "LOCAL", label: "Entrega local", hint: "La lleva un chofer de la empresa" },
];

/**
 * Captura de despacho en UN SOLO PASO: embarque → qué sale → cómo sale.
 *
 * Un envío NO sale sin saber cómo: por paquetería exige paquetería + guía
 * (la guía no se puede agregar después: `Despacho` no tiene `PATCH`); local
 * exige el chofer (empleado del catálogo `choferes` del onboarding).
 *
 * El selector de embarque vive FUERA del <form>: su buscador es un input de
 * texto y un Enter accidental ahí registraría un despacho irreversible.
 */
export function ShippingCreateForm({ onSuccess }: ShippingCreateFormProps) {
  const {
    selectedPackingId,
    selectPacking,
    packing,
    rows,
    availableRowsCount,
    alreadyShippedCount,
    embarque,
    selectedCount,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    serverBanner,
    dismissBanner,
    staleNotice,
    dismissStaleNotice,
    guia,
    setGuia,
    tipoEnvio,
    setTipoEnvio,
    paqueteria,
    setPaqueteria,
    chofer,
    setChofer,
    choferes,
    transporteFaltante,
    isPending,
    handleSubmit,
  } = useShippingForm({ onSuccess });

  const hasPacking = selectedPackingId !== null;
  const listo = selectedCount > 0 && transporteFaltante === null;
  const paqueteriaLabel = SHIPMENT_PAQUETERIAS.find((p) => p.value === paqueteria)?.label;
  // Enter en un campo de texto no registra: el envío es irreversible.
  const blockEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
  };

  return (
    <div className="w-full space-y-4">
      {!hasPacking && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">¿Qué embarque sale?</h3>
            <p className="text-[11px] text-slate-500">El pedido, el cliente y la sucursal se heredan del embarque.</p>
          </div>
          <ShippingPackingSelector selectedPackingId={selectedPackingId} onSelect={selectPacking} disabled={isPending} />
        </section>
      )}

      {hasPacking && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleSubmit();
          }}
          className="w-full space-y-4"
        >
          {/* ── Embarque elegido en una línea, con "Cambiar" ─────────────── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-xs">
            <span className="font-mono font-bold text-slate-800 dark:text-white">{packing?.folio ?? "—"}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono font-semibold text-sky-700 dark:text-sky-300">{packing?.pedido_folio ?? "—"}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
              {packing?.cliente_nombre ?? "—"}
            </span>
            <span className="ml-auto flex items-center gap-2">
              {/* `almacen_nombre` es el almacén ORIGEN del picking, no de donde
                  sale hoy la SALIDA del despacho (su almacén actual, que el
                  onboarding aún no expone): se rotula como origen. */}
              <span className="rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Origen: {packing?.almacen_nombre ?? "—"}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => selectPacking(null)}
                className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer disabled:opacity-40"
              >
                Cambiar
              </button>
            </span>
          </div>

          {staleNotice && (
            <Notice tone="amber" role="status" onDismiss={dismissStaleNotice}>
              {staleNotice}
            </Notice>
          )}
          {serverBanner && (
            <Notice tone="rose" role="alert" onDismiss={dismissBanner}>
              {serverBanner}
            </Notice>
          )}

          {isLoading ? (
            <Loader className="py-10" title="Cargando líneas" message="Consultando qué líneas de este embarque se pueden enviar..." />
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 space-y-3 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">No se pudieron cargar las líneas del embarque</p>
              <p className="text-xs text-red-500 dark:text-red-300">{shippingOnboardingErrorMessage(error)}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          ) : rows.length === 0 ? (
            <InfoPanel title="Este embarque no tiene líneas registradas" subtitle="Cambia a otro embarque." />
          ) : embarque !== null && !embarque.despachable ? (
            // Va ANTES de "ya enviado": cuando el pedido no es despachable el
            // backend manda todas las líneas como no disponibles.
            <InfoPanel
              title="Este embarque todavía no se puede enviar"
              subtitle={embarque.motivo ?? "El pedido no permite embarque parcial y aún tiene piezas por empacar."}
            />
          ) : availableRowsCount === 0 ? (
            <InfoPanel
              title="Este embarque ya fue enviado por completo"
              subtitle={`${
                alreadyShippedCount === 1 ? "Su 1 línea ya salió" : `Sus ${alreadyShippedCount} líneas ya salieron`
              } en un envío anterior. Cambia a otro embarque.`}
            />
          ) : (
            <fieldset disabled={isPending} className="space-y-4">
              {/* Aviso, no bloqueo (nucleo-erp #1266). */}
              {embarque?.motivo && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                  <InfoIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {embarque.motivo.replace(/^Aviso:\s*/i, "").replace(/^./, (c) => c.toUpperCase())} Puedes enviar lo que ya está empacado.
                </p>
              )}

              {/* ── 1. Qué sale ─────────────────────────────────────────── */}
              <ShippingLinesTable rows={rows} />

              {/* ── 2. Cómo sale (obligatorio) ──────────────────────────── */}
              <section className="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3 space-y-3">
                <div className="flex items-center gap-2.5">
                  <StepBadge n={2} done={transporteFaltante === null} />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cómo sale</h3>
                </div>

                {/* Segmentado: paquetería / local. */}
                <div role="radiogroup" aria-label="Tipo de envío" className="grid grid-cols-2 gap-2">
                  {TIPOS_ENVIO.map((t) => {
                    const active = tipoEnvio === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setTipoEnvio(t.value)}
                        className={`rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                          active
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10 ring-1 ring-sky-500"
                            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                        }`}
                      >
                        <span className={`block text-sm font-semibold ${active ? "text-sky-700 dark:text-sky-300" : "text-slate-700 dark:text-slate-200"}`}>
                          {t.label}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {tipoEnvio === "PAQUETERIA" ? (
                  <>
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Paquetería <span className="text-rose-500">*</span>
                      </p>
                      <div role="radiogroup" aria-label="Paquetería" className="flex flex-wrap gap-1.5">
                        {SHIPMENT_PAQUETERIAS.map((p) => {
                          const active = paqueteria === p.value;
                          return (
                            <button
                              key={p.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setPaqueteria(p.value)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer active:scale-95 ${
                                active
                                  ? "border-sky-600 bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sky-400"
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="guia" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Guía <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="guia"
                        name="guia"
                        aria-required="true"
                        autoComplete="off"
                        placeholder={paqueteriaLabel ? `Número de guía de ${paqueteriaLabel}` : "Número de guía"}
                        maxLength={SHIPMENT_GUIA_MAX_LENGTH}
                        value={guia}
                        onChange={(event) => setGuia(event.target.value.toUpperCase())}
                        onKeyDown={blockEnter}
                        className={`h-11 w-full rounded-xl border bg-white dark:bg-zinc-900 px-3 font-mono text-base font-bold tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          guia.trim() ? "border-slate-200 dark:border-white/10" : "border-amber-300 dark:border-amber-500/40"
                        }`}
                      />
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Sin guía no sale: no se puede agregar después.
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Chofer <span className="text-rose-500">*</span>
                    </p>
                    {choferes.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        No hay choferes dados de alta. Pide a RH que marque al empleado como chofer.
                      </p>
                    ) : (
                      <div role="radiogroup" aria-label="Chofer" className="grid gap-1.5 sm:grid-cols-2">
                        {choferes.map((c) => {
                          const active = chofer === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setChofer(c.id)}
                              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition cursor-pointer active:scale-[0.98] ${
                                active
                                  ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10 ring-1 ring-sky-500"
                                  : "border-slate-200 dark:border-white/10 hover:border-sky-400"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                                  active ? "bg-sky-600 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {iniciales(c.nombre)}
                              </span>
                              <span className={`text-xs font-semibold leading-tight ${active ? "text-sky-700 dark:text-sky-300" : "text-slate-700 dark:text-slate-200"}`}>
                                {c.nombre}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </fieldset>
          )}

          {isFetching && !isLoading && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-right">Actualizando la disponibilidad de las líneas...</p>
          )}

          {/* ── Pie: qué falta / resumen + registrar ───────────────────── */}
          {availableRowsCount > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 dark:border-white/10 pt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {transporteFaltante ? (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{transporteFaltante}</span>
                ) : (
                  <>
                    <b className="text-slate-800 dark:text-slate-100">
                      {selectedCount} {selectedCount === 1 ? "línea" : "líneas"}
                    </b>
                    {" por "}
                    <b className="text-slate-800 dark:text-slate-100">
                      {tipoEnvio === "PAQUETERIA"
                        ? `${paqueteriaLabel} · ${guia.trim()}`
                        : choferes.find((c) => c.id === chofer)?.nombre ?? "chofer"}
                    </b>
                  </>
                )}
              </p>
              {/* `disabled` incluye `isPending`: ver `FormSubmitButton`. */}
              <FormSubmitButton isPending={isPending} loadingLabel="Registrando..." disabled={isPending || !listo}>
                Registrar envío
              </FormSubmitButton>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

/** "SALVADOR LOPEZ ANGEL" → "SL". */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

/** Número de paso; se vuelve palomita cuando ya está completo. */
export function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white transition-colors ${
        done ? "bg-emerald-500" : "bg-sky-600"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

function Notice({
  tone,
  role,
  onDismiss,
  children,
}: {
  tone: "amber" | "rose";
  role: "status" | "alert";
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const c =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
      : "border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 font-semibold";
  const Icon = tone === "amber" ? InfoIcon : ExclamationTriangleIcon;
  return (
    <div role={role} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${c}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="min-w-0 flex-1 text-sm">{children}</p>
      <button type="button" onClick={onDismiss} aria-label="Descartar aviso" className="shrink-0 p-1 rounded-lg hover:opacity-70 cursor-pointer">
        ×
      </button>
    </div>
  );
}

/** Panel informativo ámbar para los casos sin nada que despachar. */
function InfoPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
        <InfoIcon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">{title}</h3>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
