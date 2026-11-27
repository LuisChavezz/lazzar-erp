"use client";

import { useState } from "react";

import {
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormTextarea } from "@/src/components/FormTextarea";
import { Loader } from "@/src/components/Loader";
import {
  ExclamationTriangleIcon,
  InfoIcon,
} from "@/src/components/Icons";
import { PackingBoxesBoard } from "./PackingBoxesBoard";
import {
  usePackingStep2Form,
  type PackingZeroPendingCause,
} from "../hooks/usePackingStep2Form";
import type { PackingStep1Values } from "../schemas/packing.schema";

interface PackingWizardStep2Props {
  step1: PackingStep1Values;
  onBack: () => void;
  onSuccess: () => void;
}

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
    boxes,
    setBoxes,
    boxLines,
    status,
    pesoTotal,
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

  const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });
  const cajasTxt = (ns: number[], uno: string, varios: string) =>
    ns.length === 1 ? `Caja ${ns[0]} ${uno}` : `Cajas ${ns.join(", ")} ${varios}`;
  // Primer motivo que impide registrar, dicho en el pie junto al botón.
  const bloqueo =
    status.excedidas.length > 0
      ? "Hay piezas de más"
      : status.cajasVacias.length > 0
        ? cajasTxt(status.cajasVacias, "vacía", "vacías")
        : status.cajasSinPeso.length > 0
          ? status.cajasSinPeso.length === 1
            ? `Falta el peso de la caja ${status.cajasSinPeso[0]}`
            : `Falta el peso de las cajas ${status.cajasSinPeso.join(", ")}`
          : null;
  const bloqueado = bloqueo !== null;

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
            <PackingBoxesBoard
              rows={rows}
              boxLines={boxLines}
              boxes={boxes}
              setBoxes={setBoxes}
              status={status}
              pesoTotal={pesoTotal}
            />

            <section>
              <div className="flex flex-wrap items-end gap-4">
                {!notaAbierta && (
                  <button
                    type="button"
                    onClick={() => setNotaAbierta(true)}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
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
              <b className="text-slate-800 dark:text-slate-100">{miles(status.acomodadas)} pzas</b>
              {" en "}
              <b className="text-slate-800 dark:text-slate-100">
                {boxes.length} {boxes.length === 1 ? "caja" : "cajas"}
              </b>
              {pesoTotal !== null && <> · {miles(pesoTotal)} kg</>}
              {bloqueado && (
                <span
                  className={`ml-2 font-semibold ${
                    status.excedidas.length > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {bloqueo}
                </span>
              )}
            </p>
          )}
          {/* `disabled` incluye `isPending`: ver `FormSubmitButton`. */}
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Registrando..."
            disabled={isPending || selectedCount === 0 || bloqueado}
          >
            Registrar embarque
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
