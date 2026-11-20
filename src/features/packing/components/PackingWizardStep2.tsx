"use client";

import { useState } from "react";

import {
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { SkuCode } from "@/src/components/SkuCode";
import { hasLineCode, type LineCodes } from "@/src/utils/sku";
import { FormTextarea } from "@/src/components/FormTextarea";
import { Loader } from "@/src/components/Loader";
import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import {
  ExclamationTriangleIcon,
  CheckIcon,
  InfoIcon,
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
    title: "Este surtido ya fue completamente empacado",
    subtitle: "Regresa para elegir otro surtido.",
  },
  "never-assigned": {
    title: "Este surtido no tiene cantidad asignada para empacar",
    subtitle:
      "Sus líneas no tienen cantidad asignada — puede tratarse de un surtido registrado antes de que existiera la captura parcial por tallas. Regresa para elegir otro surtido.",
  },
  mixed: {
    title: "Este surtido ya no tiene nada pendiente por empacar",
    subtitle: "Regresa para elegir otro surtido.",
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
  // Nota colapsada por defecto; abierta si ya trae texto.
  const [notaAbierta, setNotaAbierta] = useState(header.observaciones.trim() !== "");
  // Líneas con su nota desplegada (además de las que ya traen texto).
  const [notasLinea, setNotasLinea] = useState<ReadonlySet<string>>(() => new Set());

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando pendientes"
        message="Consultando lo que queda por empacar de este surtido..."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            No se pudieron cargar los pendientes del surtido
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            Regresa e intenta seleccionar el surtido de nuevo.
          </p>
        </div>
        <div className="flex justify-start">
          <FormSecondaryButton label="Regresar" onClick={onBack} />
        </div>
      </div>
    );
  }

  const noPending = rows.length === 0 || pendingRowsCount === 0;

  // ── Atajos y conteos en vivo ────────────────────────────────────────────
  const pendienteDe = (row: (typeof rows)[number]) => Number.parseFloat(row.cantidad_pendiente_empacar) || 0;
  const totalPendiente = rows.reduce((acc, row) => acc + Math.max(0, pendienteDe(row)), 0);
  const totalEmpacar = rows.reduce((acc, row) => acc + (Number.parseFloat(quantities[String(row.picking_detalle)] ?? "") || 0), 0);
  const todoCapturado = totalPendiente > 0 && totalEmpacar >= totalPendiente;
  const empacarTodo = () => {
    for (const row of rows) {
      const p = pendienteDe(row);
      if (p > 0) setQuantity(row.picking_detalle, String(p));
    }
  };
  const limpiar = () => {
    for (const row of rows) setQuantity(row.picking_detalle, "");
  };
  const cajas = Number.parseInt(header.numero_cajas, 10);
  const cajasValidas = Number.isInteger(cajas) && cajas >= 1;
  const setCajas = (n: number) => setHeader((prev) => ({ ...prev, numero_cajas: String(Math.max(1, n)) }));
  const codigosDe = (row: (typeof rows)[number]): LineCodes => ({
    producto_variante_sku: row.producto_variante_sku ?? row.sku_muestra,
    producto_codigo: row.producto_codigo,
    producto_cod_proscai: row.producto_cod_proscai,
  });
  const conCodigos = hasLineCode(rows.map(codigosDe));
  const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });

  return (
    // `noValidate`: el esquema y el banner deciden, no el globo nativo.
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleSubmit();
      }}
      className="w-full space-y-4"
    >
      {/* ── Resumen del surtido en una línea ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-xs">
        <span className="font-mono font-bold text-slate-800 dark:text-white">{picking?.folio ?? "—"}</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="font-mono font-semibold text-sky-700 dark:text-sky-300">{picking?.pedido_folio ?? "—"}</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200" title={picking?.cliente_nombre ?? undefined}>
          {picking?.cliente_nombre ?? "—"}
        </span>
        <span className="ml-auto rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {picking?.almacen_nombre ?? "—"}
        </span>
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

      {/* ── Banner de error ─────────────────────────────────────────────── */}
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

      <fieldset disabled={isPending} className="space-y-4">
        {noPending ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <InfoIcon className="w-5 h-5" />
            </div>
            {rows.length === 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Este surtido no tiene líneas registradas
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Regresa para elegir otro surtido.</p>
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
          <>
            {/* ── 1. Qué va en el embarque ─────────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-600 text-[11px] font-bold text-white">1</span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Qué va en este embarque</h3>
                    <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      <b className={todoCapturado ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}>
                        {miles(totalEmpacar)}
                      </b>{" "}
                      de {miles(totalPendiente)} pzas pendientes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {totalEmpacar > 0 && (
                    <button
                      type="button"
                      onClick={limpiar}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={empacarTodo}
                    disabled={todoCapturado}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  >
                    <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Empacar todo
                  </button>
                </div>
              </div>
              {/* Barra de avance de lo capturado contra lo pendiente. */}
              <div className="h-1 w-full bg-slate-100 dark:bg-white/5">
                <div
                  className={`h-full transition-all duration-300 ${todoCapturado ? "bg-emerald-500" : "bg-sky-500"}`}
                  style={{ width: `${totalPendiente > 0 ? Math.min(100, (totalEmpacar / totalPendiente) * 100) : 0}%` }}
                />
              </div>

              <ul className="divide-y divide-slate-100 dark:divide-white/5 max-h-[38vh] overflow-y-auto">
                {rows.map((row) => {
                  const key = String(row.picking_detalle);
                  const pendiente = pendienteDe(row);
                  const sinPendiente = pendiente <= 0;
                  const qtyValue = quantities[key] ?? "";
                  const qty = Number.parseFloat(qtyValue) || 0;
                  const completa = !sinPendiente && qty >= pendiente;
                  const nombre = packingLineProductoNombre(row);
                  return (
                    <li
                      key={key}
                      className={`px-4 py-2.5 transition-colors ${
                        sinPendiente ? "opacity-40" : completa ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            completa ? "bg-emerald-500" : qty > 0 ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        {/* SKU partido por "/" (modelo / color / talla) + Proscai debajo. */}
                        {conCodigos && (
                          <div className="w-28 shrink-0 text-xs">
                            <SkuCode linea={codigosDe(row)} />
                          </div>
                        )}
                        <div
                          className="min-w-0 flex-1"
                          title={`Asignada ${formatExactQuantityValue(row.cantidad_asignada)} · Surtida ${formatExactQuantityValue(row.cantidad_surtida)} · Ya empacada ${formatExactQuantityValue(row.cantidad_ya_empacada)}`}
                        >
                          <p className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{nombre}</span>
                            {row.talla_nombre && (
                              <span className="shrink-0 rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {row.talla_nombre}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.color_nombre && <>{row.color_nombre} · </>}
                            {sinPendiente ? (
                              "Ya empacada"
                            ) : (
                              <button
                                type="button"
                                onClick={() => setQuantity(row.picking_detalle, String(pendiente))}
                                className="font-semibold tabular-nums text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                                title="Empacar lo pendiente de esta línea"
                              >
                                Pendiente {formatExactQuantityValue(row.cantidad_pendiente_empacar)}
                              </button>
                            )}
                            {qty > 0 && !notasLinea.has(key) && !(lineObservaciones[key] ?? "").trim() && (
                              <button
                                type="button"
                                onClick={() => setNotasLinea((prev) => new Set(prev).add(key))}
                                className="ml-2 text-slate-400 hover:text-sky-600 hover:underline cursor-pointer"
                              >
                                + nota
                              </button>
                            )}
                          </p>
                        </div>
                        <DecimalQuantityInput
                          value={qtyValue}
                          max={pendiente}
                          disabled={sinPendiente}
                          onChange={(next) => setQuantity(row.picking_detalle, next)}
                          label={`Cantidad a empacar de ${nombre}`}
                        />
                      </div>
                      {qty > 0 && (notasLinea.has(key) || (lineObservaciones[key] ?? "").trim() !== "") && (
                        <div className="mt-1.5 pl-5">
                          <FormInput
                            variant="compact"
                            placeholder="Nota de esta línea (opcional)"
                            forceUppercase
                            value={lineObservaciones[key] ?? ""}
                            onChange={(event) => setLineObservacion(row.picking_detalle, event.target.value)}
                            aria-label={`Observaciones de ${nombre}`}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ── 2. Cómo sale: cajas (obligatorio) y peso ─────────────── */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-600 text-[11px] font-bold text-white">2</span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cómo sale</h3>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="numero_cajas" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Cajas <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className={`inline-flex items-center rounded-xl border ${
                      cajasValidas
                        ? "border-slate-200 dark:border-white/10"
                        : "border-amber-300 dark:border-amber-500/40"
                    } bg-white dark:bg-zinc-900`}
                  >
                    <button
                      type="button"
                      aria-label="Una caja menos"
                      onClick={() => setCajas((cajasValidas ? cajas : 1) - 1)}
                      className="grid h-11 w-11 place-items-center text-lg font-bold text-slate-500 hover:text-sky-600 cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      id="numero_cajas"
                      name="numero_cajas"
                      inputMode="numeric"
                      aria-required="true"
                      placeholder="0"
                      value={header.numero_cajas}
                      onChange={(event) => setHeader((prev) => ({ ...prev, numero_cajas: event.target.value }))}
                      className="h-11 w-16 bg-transparent text-center text-xl font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Una caja más"
                      onClick={() => setCajas((cajasValidas ? cajas : 0) + 1)}
                      className="grid h-11 w-11 place-items-center text-lg font-bold text-slate-500 hover:text-sky-600 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="w-36">
                  <FormInput
                    label="Peso (kg, opcional)"
                    name="peso_total"
                    type="text"
                    inputMode="decimal"
                    value={header.peso_total}
                    placeholder="0.000"
                    onChange={(event) =>
                      setHeader((prev) => ({
                        ...prev,
                        peso_total: sanitizeDecimalInput(event.target.value, HEADER_DECIMAL_PLACES, {
                          keepLeadingMinus: true,
                        }),
                      }))
                    }
                  />
                </div>
                {!notaAbierta && (
                  <button
                    type="button"
                    onClick={() => setNotaAbierta(true)}
                    className="mb-2 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    + Agregar nota
                  </button>
                )}
              </div>
              {notaAbierta && (
                <div className="mt-3">
                  <FormTextarea
                    label="Nota del embarque (opcional)"
                    name="observaciones"
                    placeholder="Notas del embarque"
                    rows={2}
                    value={header.observaciones}
                    onChange={(event) => setHeader((prev) => ({ ...prev, observaciones: event.target.value }))}
                  />
                </div>
              )}
            </section>
          </>
        )}
      </fieldset>

      {/* ── Pie: resumen + acción ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/10 pt-3">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={isPending} />
        <div className="flex items-center gap-3">
          {!noPending && (
            <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              <b className="text-slate-800 dark:text-slate-100">{miles(totalEmpacar)} pzas</b>
              {" en "}
              <b className={cajasValidas ? "text-slate-800 dark:text-slate-100" : "text-amber-600 dark:text-amber-400"}>
                {cajasValidas ? `${cajas} ${cajas === 1 ? "caja" : "cajas"}` : "? cajas"}
              </b>
            </p>
          )}
          {/* `disabled` incluye `isPending`: ver `FormSubmitButton`. */}
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Registrando..."
            disabled={isPending || selectedCount === 0 || !cajasValidas}
          >
            Registrar embarque
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
